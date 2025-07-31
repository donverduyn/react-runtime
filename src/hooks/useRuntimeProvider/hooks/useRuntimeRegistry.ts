import { ManagedRuntime } from 'effect';
import type {
  Config,
  RuntimeInstance,
  RuntimePayload,
} from 'components/common/types';
import { createSingletonHook } from '../../common/factories/SingletonFactory';
import type { RuntimeKey, ComponentId, RuntimeId, ParentId } from '../types';

type RuntimeMapping = Map<ComponentId | ParentId, Map<RuntimeKey, RuntimeId[]>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RuntimeRegistry = Map<RuntimeId, RuntimeInstance<any>>;
type RuntimeCountMap = Map<ComponentId | ParentId, Map<RuntimeKey, number>>;

// type ListenerMap = Map<RuntimeId, (() => void)[]>;
type DisposerMap = Map<ComponentId, Map<RuntimeId, NodeJS.Timeout>>;

export const defaultConfig = {
  debug: false,
  postUnmountTTL: 1000,
  env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  cleanupPolicy: 'onUnmount', // only used with replace: true
  replace: false,
} satisfies Partial<Config>;

export function createRuntimeRegistry() {
  const runtimeMapping: RuntimeMapping = new Map();
  const registry: RuntimeRegistry = new Map();
  const runtimeCounts: RuntimeCountMap = new Map();
  const disposerMap: DisposerMap = new Map();
  // const listeners: ListenerMap = new Map();

  function register(
    id: ComponentId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: RuntimePayload<any>
  ) {
    const { context, config, entryId } = payload;
    let runtimeKeyMap = runtimeMapping.get(id);
    if (!runtimeKeyMap) {
      runtimeKeyMap = new Map();
      runtimeMapping.set(id, runtimeKeyMap);
    }

    // Initialize count for this runtime key
    if (!runtimeCounts.has(id)) {
      runtimeCounts.set(id, new Map());
    }
    const counts = runtimeCounts.get(id)!;
    let currentCount = counts.get(context.key) ?? 0;
    // we have to allow multiple runtimes with the same key
    // so we need to use the entry id inside the payload
    // and use the config to determine if we should replace or not
    if (
      !runtimeKeyMap.has(context.key) ||
      runtimeKeyMap.get(context.key)?.[currentCount] !== entryId
    ) {
      const runtimeId = entryId as RuntimeId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance: RuntimeInstance<any> = {
        runtime: ManagedRuntime.make(context.layer),
        config: Object.assign({}, defaultConfig, config),
      };
      registry.set(runtimeId, instance);
      const updatedIds = (runtimeKeyMap.get(context.key) ?? []).concat(
        runtimeId
      );
      runtimeKeyMap.set(context.key, updatedIds);
      currentCount += 1;
      counts.set(context.key, currentCount);
    }

    // listeners.forEach((fn) => fn());
    const currentId = runtimeKeyMap.get(context.key)?.[currentCount - 1];
    return registry.get(currentId!)!;
  }

  function dispose(id: ComponentId, runtimeId: RuntimeId, cleanup: () => void) {
    void registry.get(runtimeId)?.runtime.dispose();
    registry.delete(runtimeId);
    const componentDisposerMap = disposerMap.get(id);
    if (!componentDisposerMap) {
      throw new Error(noDisposerMapMessage(id));
    }
    const timeout = componentDisposerMap.get(runtimeId);
    if (!timeout) {
      throw new Error(noTimeoutMessage(id, runtimeId));
    }
    clearTimeout(componentDisposerMap.get(runtimeId));
    componentDisposerMap.delete(runtimeId);

    if (componentDisposerMap.size === 0) {
      disposerMap.delete(id);
      runtimeMapping.delete(id);
      runtimeCounts.delete(id);
      cleanup();
    }
  }

  // called on unmount
  function unregister(id: ComponentId, cleanup: () => void) {
    const keyMap = runtimeMapping.get(id);
    if (!disposerMap.has(id)) {
      disposerMap.set(id, new Map());
    }
    keyMap?.forEach((runtimeIds) => {
      runtimeIds.forEach((runtimeId) => {
        const instance = registry.get(runtimeId);
        if (instance) {
          const timeout = setTimeout(
            () => dispose(id, runtimeId, cleanup),
            instance.config.postUnmountTTL
          );
          disposerMap.get(id)?.set(runtimeId, timeout);
        }
      });
    });

    const counts = runtimeCounts.get(id);
    if (counts) {
      counts.keys().forEach((key) => {
        counts.set(key, 0);
      });
    }
  }

  function subscribe(id: RuntimeKey) {
    return (fn: () => void) => {
      // listeners.set(fn);
      return () => {
        // listeners.delete(fn);
      };
    };
  }

  function getById(id: ComponentId | ParentId, key: RuntimeKey) {
    const count = runtimeCounts.get(id)?.get(key) ?? 0;
    const runtimeId = runtimeMapping.get(id)?.get(key)?.[count];
    return (runtimeId && registry.get(runtimeId)) ?? null;
  }

  return {
    register,
    unregister,
    getById,
    subscribe,
    registry, // exposed for advanced use/testing
  };
}

export const useRuntimeRegistry = createSingletonHook(createRuntimeRegistry);

const noDisposerMapMessage = (id: ComponentId) =>
  `No disposer map found for component ${id}. This may indicate a bug in the runtime management logic.`;

const noTimeoutMessage = (id: ComponentId, runtimeId: RuntimeId) =>
  `No timeout found for component ${id} and runtime ${runtimeId}.`;
