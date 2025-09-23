import { ManagedRuntime } from 'effect';
import type {
  RegisterId,
  RuntimeConfig,
  RuntimeId,
  RuntimeInstance,
  RuntimeKey,
  RuntimePayload,
  ScopeId,
} from '@/types';
import { createProxy } from '@/utils/effect';
import { cloneNestedMap, deepMergeMapsInPlace } from '@/utils/map';
import { createSingletonHook } from '../../common/factories/SingletonFactory';

export const defaultConfig = {
  debug: false,
  postUnmountTTL: 1000,
  env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  cleanupPolicy: 'onUnmount', // only used with replace: true
  replace: false,
} satisfies Partial<RuntimeConfig>;

export function createRuntimeRegistry(_: ScopeId) {
  const runtimeMapping: Map<
    RegisterId,
    Map<RuntimeKey, Map<number, RuntimeId>>
  > = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registry: Map<RuntimeId, RuntimeInstance<any, any>> = new Map();
  const isolatedMapping: Map<
    RegisterId,
    Map<RuntimeKey, Map<number, RuntimeId>>
  > = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isolatedRegistry: Map<RuntimeId, RuntimeInstance<any, any>> = new Map();
  const disposerMap: Map<
    RegisterId,
    Map<RuntimeId, NodeJS.Timeout>
  > = new Map();
  const promotionMap: Map<RegisterId, boolean> = new Map();
  // const listeners: ListenerMap = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function registerIsolated<P>(id: RegisterId, payload: RuntimePayload<any>) {
    const exists = getById(id, payload.context.key, payload.index);
    if (exists) return exists;
    const { context, config, providerId: entryId } = payload;
    const runtimeId = entryId as RuntimeId;
    let runtimeKeyMap = isolatedMapping.get(id);
    if (!runtimeKeyMap) {
      runtimeKeyMap = new Map();
      isolatedMapping.set(id, runtimeKeyMap);
    }
    if (!runtimeKeyMap.has(context.key)) {
      runtimeKeyMap.set(context.key, new Map());
    }
    const runtimeIdMap = runtimeKeyMap.get(context.key)!;
    runtimeIdMap.set(payload.index, runtimeId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance: RuntimeInstance<any, P> = {
      runtime: ManagedRuntime.make(context.layer),
      config: Object.assign({}, defaultConfig, config),
      propsProxy: createProxy({} as Record<never, never> & P),
    };
    isolatedRegistry.set(runtimeId, instance);

    const currentId = runtimeKeyMap.get(context.key)?.get(payload.index);
    return isolatedRegistry.get(currentId!)!;
  }

  function register<P>(
    id: RegisterId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: RuntimePayload<any>
  ) {
    // console.log('register', id.substring(0, 3), payload);
    const exists = getById(id, payload.context.key, payload.index);
    if (exists) return exists;

    const { context, config, providerId: entryId } = payload;
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
    const instance: RuntimeInstance<any, P> = {
      runtime: ManagedRuntime.make(context.layer),
      config: Object.assign({}, defaultConfig, config),
      propsProxy: createProxy({} as Record<never, never> & P),
    };
    registry.set(runtimeId, instance);

    // listeners.forEach((fn) => fn());
    const currentId = runtimeKeyMap.get(context.key)?.get(payload.index);
    return registry.get(currentId!)!;
  }

  function dispose(id: RegisterId, runtimeId: RuntimeId, cleanup: () => void) {
    // console.log('dispose', id.substring(0, 3), runtimeId);
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
    // console.log('unregister', id.substring(0, 3));
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
    // console.log('keepalive', id.substring(0, 3));
    // use the disposer map to clear the timeouts
    const map = disposerMap.get(id);
    if (map) {
      map.forEach(clearTimeout);
      map.clear();
    }
  }

  function subscribe(_: RuntimeKey) {
    return (__: () => void) => {
      // listeners.set(fn);
      return () => {
        // listeners.delete(fn);
      };
    };
  }

  function getById(
    id: RegisterId,
    key: RuntimeKey,
    index: number,
    snapshot?: typeof runtimeMapping | null
  ) {
    const keyMap = snapshot ?? runtimeMapping;
    const runtimeId = keyMap.get(id)?.get(key)?.get(index);
    return (runtimeId && registry.get(runtimeId)) ?? null;
  }

  // function commitIsolatedById(id: RegisterId) {
  //   const keyMap = isolatedMapping.get(id);
  //   if (!keyMap) return;
  //   // register keyMap into main registry
  //   runtimeMapping.set(id, keyMap);

  //   // register isolated instances into main registry and delete from isolated registry.
  //   keyMap.forEach((idMap) => {
  //     idMap.forEach((runtimeId) => {
  //       const instance = isolatedRegistry.get(runtimeId);
  //       if (instance) {
  //         isolatedRegistry.delete(runtimeId);
  //         registry.set(runtimeId, instance);
  //       }
  //     });
  //   });
  //   // clean up
  //   isolatedMapping.delete(id);
  //   // initiate promotion state for the id, so gcUnpromoted can work correctly, with aborted renders.
  //   promotionMap.set(id, false);

  //   return keyMap.entries().reduce((instances, [key, idMap]) => {
  //     idMap.forEach((runtimeId) => {
  //       const instance = isolatedRegistry.get(runtimeId);
  //       if (instance) {
  //         registry.set(runtimeId, instance);
  //         instances.set(key, instance);
  //       }
  //     });
  //     return instances;
  //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   }, new Map<RuntimeKey, RuntimeInstance<any>>());
  //   // commit happens in the render phase, so promotion happens pre-commit when layoutEffect runs.
  // }

  function promoteById(id: RegisterId) {
    promotionMap.set(id, true);
  }

  // TODO: dispose instead brute force delete, because we might want to rehydrate after suspense. maybe we can check whether the registerId eligable for hydration, since we already know which components will be unable to hydrate previous runtime instances, based on whether they have a salt.

  // TODO: also consider what we do, when postUnmountTTL is 0 during strict mode double invoke,

  // TODO: consider checking if the runtime is in use, before disposing, so it doesn't matter if queueMicrotask is triggered after a component remounts again, which would normally not remove the disposal amount in this case, leading to the instance being disposed while in use.

  // TODO: think whether this is valid, that we use something that ought to be disposed, since if we reconstruct off tree, this could need a rerender from the top to reinstantiate the runtime that was incorrectly created from a disposed suspended render.

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
    const isolatedKeyMap = isolatedMapping.get(id);
    isolatedKeyMap?.forEach((runtimeIds) => {
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

  // we also need a way to immediately dispose isolated instances, so we might want to have separate method to export and call that method from gcUnpromoted

  function gcIsolated(id: RegisterId) {
    const keyMap = isolatedMapping.get(id);
    if (!keyMap) return; // if gc'd

    keyMap.forEach((idMap) => {
      idMap.forEach((runtimeId) => {
        const instance = isolatedRegistry.get(runtimeId);
        if (instance) {
          void instance.runtime.dispose();
          isolatedRegistry.delete(runtimeId);
        }
      });
    });
  }

  function getSnapshot() {
    return cloneNestedMap(runtimeMapping);
  }

  function mergeIsolatedById(registerId: RegisterId) {
    const keyMap = isolatedMapping.get(registerId) ?? null;
    const collected = keyMap?.values().reduce((instances, idMap) => {
      idMap.forEach((runtimeId) => {
        const instance = isolatedRegistry.get(runtimeId);
        return instance ? instances.set(runtimeId, instance) : instances;
      });
      return instances;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, new Map<RuntimeId, RuntimeInstance<any>>());

    if (!keyMap) return;
    // register keyMap into main registry
    const currentValue = runtimeMapping.get(registerId);
    const newValue = currentValue
      ? deepMergeMapsInPlace(currentValue, keyMap)
      : keyMap;
    runtimeMapping.set(registerId, newValue);

    keyMap.forEach((idMap) => {
      idMap.forEach((runtimeId) => {
        const instance = collected?.get(runtimeId);
        if (instance) {
          registry.set(runtimeId, instance);
        }
      });
    });
  }

  return {
    keepAlive,
    promoteById,
    gcUnpromoted,
    registerIsolated,
    // commitIsolatedById,
    gcIsolated,
    register,
    unregister,
    getById,
    mergeIsolatedById,
    getSnapshot,
    subscribe,
    registry, // exposed for advanced use/testing
  };
}

export const useRuntimeRegistry = createSingletonHook(createRuntimeRegistry);
