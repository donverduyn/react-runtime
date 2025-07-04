// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Layer, ManagedRuntime } from 'effect';
import type {
  Config,
  PreparedRuntimeContext,
  RuntimeContext,
  RuntimeInstance,
} from 'components/common/types';
import { deepEqual } from 'utils/object';

// const createRuntime = memoize(
//   <T,>(layer: Layer.Layer<T>, runtimeId: string, config: Config) => {
//     printLog(config, `creating runtime ${runtimeId}`);
//     const instance = ManagedRuntime.make(layer);
//     return Object.assign(instance, {
//       id: runtimeId,
//       config,
//     }) as RuntimeInstance<T>;
//   },
//   // this prevents a second instantiation in strict mode inside the useState function, which gets disposed immediately, and it since it has no side effects, we are safe.
//   { isShallowEqual: true, maxAge: 100, maxArgs: 2 }
// );

/*
This hook creates a runtime and disposes it when the component is unmounted.
It is used by withRuntime to create a runtime for the context. 
This is both compatible with strict mode and fast refresh. 🚀
*/

// export const useRuntimeInstance = <T,>(
//   layer: Layer.Layer<T>,
//   config: Config
// ) => {
//   // TODO: use useSyncExternalStore to keep track of runtime instances and dispose them based on postUnmountTTL. Rehydrate the runtime instances on mount (maybe we need a component name/id combo here). The idea is that we can control the rotation of runtime instances based on what's in the map. This way we can control how any concurrent mode pecularities affect it. This also means we would no longer need to memoize the factory in useState, because the defensive logic would be in the store, to prevent unwanted half executed rotations.

//   const layerRef = React.useRef(layer);
//   const shouldCreate = React.useRef(false);
//   const runtimeId = React.useRef(uuid());
//   const hasMounted = React.useRef(false);
//   const configRef = React.useRef(config);

//   const [runtime, setRuntime] = React.useState(() =>
//     createRuntime(layerRef.current, runtimeId.current, config)
//   );

//   React.useEffect(() => {
//     if (!deepEqual(configRef.current, config)) {
//       printLog(config, `recreating runtime ${runtimeId.current}`);
//       const newRuntime = Object.assign(ManagedRuntime.make(layer), {
//         id: uuid(),
//         config,
//       });
//       void runtime.dispose().then(() => {
//         setRuntime(() => newRuntime);
//         configRef.current = config;
//         runtimeId.current = newRuntime.id;
//       });
//     }
//   }, [config]);

//   if (!hasMounted.current) {
//     hasMounted.current = true;
//   } else {
//     printLog(config, `reusing runtime  ${runtimeId.current}`);
//   }

//   React.useEffect(() => {
//     if (shouldCreate.current || layerRef.current !== layer) {
//       layerRef.current = layer;
//       shouldCreate.current = false;
//       printLog(config, `recreating runtime ${runtimeId.current}`);
//       const newRuntime = Object.assign(ManagedRuntime.make(layer), {
//         id: uuid(),
//         config,
//       });
//       runtimeId.current = uuid();
//       setRuntime(() => newRuntime);
//     }

//     return () => {
//       printLog(config, `disposing runtime ${runtimeId.current}`);
//       setTimeout(() => void runtime.dispose(), 0);
//       shouldCreate.current = true;
//     };
//   }, [layer]);

//   return runtime;
// };

class Store {
  constructor() {
    console.log('Store initialized');
  }

  static of() {
    return new Store();
  }

  private instances = new Map<string, RuntimeInstance<any>>();
  // private contextToId = new Map<string, string>();
  private disposalTimeouts = new Map<string, NodeJS.Timeout>();
  private listeners = new WeakMap<
    RuntimeContext<any>,
    Map<string, Map<string, Set<() => void>>>
  >();
  private subscriptionsByComponentId = new Map<string, RuntimeContext<any>[]>();

  private log(config: Config, message: string) {
    if (config.debug) {
      console.log(`[${config.componentName}] ${message}`);
    }
  }

  private updateTimeout(config: Config) {
    const timeoutId = this.disposalTimeouts.get(config.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.disposalTimeouts.delete(config.id);
      this.log(config, `cleared disposal timeout for ${config.id}`);
    }
  }

  private createTimeout<T>(config: Config, instance: RuntimeInstance<T>) {
    const timeoutId = setTimeout(() => {
      void instance.dispose();
      this.disposalTimeouts.delete(config.id);
      this.log(config, `disposed runtime after TTL for ${config.id}`);
    }, instance.config.postUnmountTTL);
    this.disposalTimeouts.set(config.id, timeoutId);
  }

  private createInstance<T>(layer: Layer.Layer<T>, config: Config) {
    this.log(config, `instantiating runtime ${config.id}`);
    return Object.assign(ManagedRuntime.make(layer), {
      id: config.id,
      config,
    });
  }

  public onMount<T>(
    context: RuntimeContext<T>,
    config: Config,
    options: { notify?: boolean; update?: boolean } = {
      notify: true,
      update: false,
    }
  ) {
    // const idFromContext = this.contextToId.get(context.config.id!);
    this.updateTimeout(config);

    if (context.config.id === config.id) {
      const existingInstance = this.instances.get(context.config.id);
      if (config.fresh && existingInstance && !existingInstance.isDisposed) {
        this.log(
          config,
          `creating runtime with fresh:true for ${config.id}, replacing ${context.config.id}`
        );
        const newInstance = this.createInstance(context.layer, config);
        if (config.disposeStrategy === 'dispose') {
          setTimeout(() => {
            void existingInstance.dispose();
            existingInstance.isDisposed = true;
          }, 0);
          this.instances.set(config.id, newInstance);
          // this.contextToId.set(context.config.id, config.id);
          this.log(config, `disposed previous instance ${context.config.id}`);
        }
      } else if (options.update) {
        this.log(config, `reused existing runtime for ${context.config.id}`);
        this.updateInstance(config.id, config);
      }
    }
    console.log('instances', this.instances.keys().toArray());
    if (!this.instances.has(config.id)) {
      this.log(config, `creating new runtime for ${config.id}`);
      const instance = this.createInstance(context.layer, config);
      this.instances.set(config.id, instance);
      // this.contextToId.set(context, config.id);
    }

    if (options.notify) {
      for (const [
        componentId,
        contexts,
      ] of this.subscriptionsByComponentId.entries()) {
        for (const ctx of contexts) {
          if (ctx === context || ctx.config.id === config.id) {
            const byConfig = this.listeners.get(ctx);
            byConfig?.forEach((byComponentId) => {
              const listeners = byComponentId.get(componentId);
              listeners?.forEach((fn) => fn());
            });
          }
        }
      }
    }
  }

  public onUnmount<T>(context: RuntimeContext<T>, config: Config) {
    const instance = this.instances.get(config.id);
    if (!instance) return;

    const byConfigId = this.listeners.get(context);
    const byComponentId = byConfigId?.get(config.id);

    if (byComponentId) {
      byComponentId.delete(config.componentId);
      if (byComponentId.size === 0) byConfigId?.delete(config.id);
      if (byConfigId?.size === 0) this.listeners.delete(context);
    }

    this.log(config, `scheduled disposal for ${config.id}`);
    this.createTimeout(config, instance);
  }

  public updateInstance(id: string, config: Config) {
    const instance = this.instances.get(id);
    if (instance && !deepEqual(instance.config, config)) {
      instance.config = config;
      this.log(config, `updated config for ${id}`);
    }
  }

  public register<T>(
    context: PreparedRuntimeContext<T>,
    componentId: string
  ): RuntimeInstance<T> {
    if (!this.subscriptionsByComponentId.has(componentId)) {
      this.subscriptionsByComponentId.set(componentId, []);
    }
    this.subscriptionsByComponentId.get(componentId)!.push(context);

    this.onMount(context, context.config, { notify: false });
    return this.instances.get(context.config.id) as RuntimeInstance<T>;
  }

  public subscribe(
    contexts: PreparedRuntimeContext<any>[],
    componentId: string
  ) {
    for (const ctx of contexts) {
      const { id } = ctx.config;

      // const existing = this.instances.get(id);
      // if (!existing) this.onMount(ctx, ctx.config, { notify: false });

      if (!this.listeners.has(ctx)) this.listeners.set(ctx, new Map());
      const byConfigId = this.listeners.get(ctx)!;
      if (!byConfigId.has(id)) byConfigId.set(id, new Map());
      const byComponentId = byConfigId.get(id)!;
      if (!byComponentId.has(componentId))
        byComponentId.set(componentId, new Set());
    }

    return (listener: () => void) => {
      for (const ctx of contexts) {
        const { id } = ctx.config;
        const byComponentId = this.listeners
          .get(ctx)
          ?.get(id)
          ?.get(componentId);
        byComponentId?.add(listener);

        console.log(`Subscribing to ${id} for component ${componentId}`);
      }

      return () => {
        for (const ctx of contexts) {
          const { id } = ctx.config;
          const byConfigId = this.listeners.get(ctx);
          const byComponentId = byConfigId?.get(id);
          const set = byComponentId?.get(componentId);
          console.log(`Unsubscribing from ${id} for component ${componentId}`);

          set?.delete(listener);
          if (set?.size === 0) byComponentId?.delete(componentId);
          if (byComponentId?.size === 0) byConfigId?.delete(id);
          if (byConfigId?.size === 0) this.listeners.delete(ctx);
        }
      };
    };
  }

  public notify(context: RuntimeContext<any>) {}

  public getByInstanceId(id: string) {
    return this.instances.get(id);
  }

  private lastSnapshots = new Map<
    string,
    { keys: string[]; value: RuntimeInstance<any>[] }
  >();

  public getSnapshot(contexts: PreparedRuntimeContext<any>[]) {
    // Create a cache key based on context IDs
    const key = contexts.map((ctx) => ctx.config.id).join('|');
    const prev = this.lastSnapshots.get(key);
    const currentKeys = contexts.map((ctx) => ctx.config.id);
    const currentInstances = contexts.map(
      (ctx) => this.instances.get(ctx.config.id)!
    );

    // Compare previous and current instance references
    if (
      prev &&
      prev.keys.length === currentKeys.length &&
      prev.keys.every((k, i) => k === currentKeys[i]) &&
      prev.value.every((inst, i) => inst === currentInstances[i])
    ) {
      return () => prev.value;
    }

    this.lastSnapshots.set(key, { keys: currentKeys, value: currentInstances });
    return () => currentInstances;
  }

  // public getByRuntimeCtx(ctx: RuntimeContext<any>) {
  //   const id = this.contextToId.get(ctx.config.id);
  //   return id ? this.instances.get(id) : undefined;
  // }

  public disposeAll() {
    this.instances.forEach((instance) => {
      void instance.dispose();
    });
    this.instances.clear();
    // this.contextToId.clear();
    this.listeners = new WeakMap();
    this.subscriptionsByComponentId.clear();
    this.disposalTimeouts.forEach(clearTimeout);
    this.disposalTimeouts.clear();
  }
}

let sharedStore: Store | null = null;

export function useRuntimeStore(): Store {
  const ref = React.useRef<Store | null>(null);

  if (ref.current === null) {
    if (!sharedStore) sharedStore = Store.of();
    ref.current = sharedStore;
  }

  return ref.current;
}

export const useRuntimeStoreSubscription = <T>(
  contexts: PreparedRuntimeContext<T>[],
  componentId: string
): RuntimeInstance<T>[] => {
  const store = useRuntimeStore();
  // const instances = new Map<RuntimeContext<T>, RuntimeInstance<T>>();
  // const previous = React.useRef(new Map<string, Config>());

  // const contextKeys = JSON.stringify(
  //   contexts.map(({ config }) => ({
  //     id: config.id,
  //     hash: JSON.stringify(config),
  //   }))
  // );

  // React.useEffect(() => {
  //   const prevMap = previous.current;
  //   const currentMap = new Map<string, Config>();
  //   const seen = new Set<string>();

  //   for (const context of contexts) {
  //     const prevConfig = prevMap.get(context.config.id);
  //     seen.add(context.config.id);

  //     if (!prevConfig || !deepEqual(prevConfig, context.config)) {
  //       // store.onUnmount(context, prevConfig ?? context.config); // unmount old if different
  //       store.onMount(context, context.config, { notify: true }); // and mount new
  //     } else {
  //       store.updateInstance(context.config.id, context.config); // safe to call
  //     }

  //     currentMap.set(context.config.id, context.config);
  //   }

  //   for (const [id, oldConfig] of prevMap.entries()) {
  //     if (!seen.has(id)) {
  //       const context = contexts.find((r) => r.config.id === id);
  //       if (context) {
  //         store.onUnmount(context, oldConfig);
  //       }
  //     }
  //   }

  //   previous.current = currentMap;
  //   return () => {
  //     for (const context of contexts) {
  //       store.onUnmount(context, context.config);
  //     }
  //   };
  // }, [contextKeys]);

  const liveInstances = React.useSyncExternalStore(
    store.subscribe(contexts, componentId),
    store.getSnapshot(contexts)
  );
  return liveInstances;
};

// export const useRuntimeStoreSubscription = <T>(
//   contexts: PreparedRuntimeContext<T>[]
// ): RuntimeInstance<T> => {
//   // const configRef = React.useRef(config);
//   const shouldUpdateRef = React.useRef(false);
//   const store = useRuntimeStore();

// React.useEffect(() => {
//   if (shouldUpdateRef.current) {
//     store.onMount(context, config, { notify: true, update: false });
//     shouldUpdateRef.current = false;
//   }

//   return () => {
//     store.onUnmount(context, config);
//     shouldUpdateRef.current = true;
//   };
// }, [context]);

// if (!deepEqual(configRef.current, config)) {
//   configRef.current = config;
// }

//   const instance = React.useSyncExternalStore(
//     store.subscribe(contexts, configRef.current),
//     store.getSnapshot(configRef.current.id)
//   );

//   return instance;
// };
