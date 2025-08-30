import { ManagedRuntime } from 'effect';
import type {
  RegisterId,
  RuntimeConfig,
  RuntimeId,
  RuntimeInstance,
  RuntimeKey,
  RuntimePayload,
  ScopeId,
} from 'types';
import { createSingletonHook } from '../../common/factories/SingletonFactory';

type RuntimeMapping = Map<RegisterId, Map<RuntimeKey, Map<number, RuntimeId>>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RuntimeRegistry = Map<RuntimeId, RuntimeInstance<any>>;

// type ListenerMap = Map<RuntimeId, (() => void)[]>;
type DisposerMap = Map<RegisterId, Map<RuntimeId, NodeJS.Timeout>>;
type PromotionMap = Map<RegisterId, boolean>;

export const defaultConfig = {
  debug: false,
  postUnmountTTL: 1000,
  env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  cleanupPolicy: 'onUnmount', // only used with replace: true
  replace: false,
} satisfies Partial<RuntimeConfig>;

export function createRuntimeRegistry(scopeId: ScopeId) {
  const runtimeMapping: RuntimeMapping = new Map();
  const registry: RuntimeRegistry = new Map();
  const disposerMap: DisposerMap = new Map();
  const promotionMap: PromotionMap = new Map();
  // const listeners: ListenerMap = new Map();

  function register(
    id: RegisterId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: RuntimePayload<any>
  ) {
    const exists = getById(id, payload.context.key, payload.index);
    if (exists) return exists;
    const { context, config, entryId } = payload;
    const runtimeId = entryId as RuntimeId;
    const promoted = promotionMap.get(id);
    if (promoted === undefined) {
      promotionMap.set(id, false);
    }
    let runtimeKeyMap = runtimeMapping.get(id);
    if (!runtimeKeyMap) {
      runtimeKeyMap = new Map();
      runtimeMapping.set(id, runtimeKeyMap);
    }
    if (!runtimeKeyMap.has(context.key)) {
      runtimeKeyMap.set(context.key, new Map());
    }
    const runtimeIdMap = runtimeKeyMap.get(context.key)!;
    runtimeIdMap.set(payload.index, runtimeId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance: RuntimeInstance<any> = {
      runtime: ManagedRuntime.make(context.layer),
      config: Object.assign({}, defaultConfig, config),
    };
    registry.set(runtimeId, instance);

    // listeners.forEach((fn) => fn());
    const currentId = runtimeKeyMap.get(context.key)?.get(payload.index);
    return registry.get(currentId!)!;
  }

  function dispose(id: RegisterId, runtimeId: RuntimeId, cleanup: () => void) {
    void registry.get(runtimeId)?.runtime.dispose();
    registry.delete(runtimeId);
    const componentDisposerMap = disposerMap.get(id);
    if (componentDisposerMap) {
      const timeout = componentDisposerMap.get(runtimeId);
      if (!timeout) {
        clearTimeout(timeout);
        componentDisposerMap.delete(runtimeId);
      }

      if (componentDisposerMap.size === 0) {
        disposerMap.delete(id);
        runtimeMapping.delete(id);
        promotionMap.delete(id);
        cleanup();
      }
    }
  }

  // called on unmount
  function unregister(id: RegisterId, cleanup?: () => void) {
    const keyMap = runtimeMapping.get(id);
    if (!keyMap) return; // if gc'd
    if (!disposerMap.has(id)) {
      disposerMap.set(id, new Map());
    }
    keyMap.forEach((runtimeIds) => {
      runtimeIds.forEach((runtimeId) => {
        const instance = registry.get(runtimeId);
        if (instance) {
          const timeout = setTimeout(
            () => dispose(id, runtimeId, cleanup ?? (() => {})),
            instance.config.postUnmountTTL
          );
          disposerMap.get(id)?.set(runtimeId, timeout);
        }
      });
    });
  }

  function keepAlive(id: RegisterId) {
    // use the disposer map to clear the timeouts
    const map = disposerMap.get(id);
    if (map) {
      map.forEach(clearTimeout);
      map.clear();
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

  function getById(id: RegisterId, key: RuntimeKey, index: number) {
    const runtimeId = runtimeMapping.get(id)?.get(key)?.get(index);
    return (runtimeId && registry.get(runtimeId)) ?? null;
  }

  function promoteById(id: RegisterId) {
    promotionMap.set(id, true);
  }

  function gcUnpromoted(id: RegisterId) {
    const promoted = promotionMap.get(id);
    if (promoted === true) return;

    const keyMap = runtimeMapping.get(id);
    keyMap?.forEach((runtimeIds) => {
      runtimeIds.forEach((runtimeId) => {
        const instance = registry.get(runtimeId);
        if (instance) {
          void registry.get(runtimeId)?.runtime.dispose();
          registry.delete(runtimeId);
        }
      });
    });
    disposerMap.delete(id);
    runtimeMapping.delete(id);
    promotionMap.delete(id);
  }

  return {
    keepAlive,
    promoteById,
    gcUnpromoted,
    register,
    unregister,
    getById,
    subscribe,
    registry, // exposed for advanced use/testing
  };
}

export const useRuntimeRegistry = createSingletonHook(createRuntimeRegistry);

const noDisposerMapMessage = (id: RegisterId) =>
  `No disposer map found for component ${id}. This may indicate a bug in the runtime management logic.`;

const noTimeoutMessage = (id: RegisterId, runtimeId: RuntimeId) =>
  `No timeout found for component ${id} and runtime ${runtimeId}.`;
