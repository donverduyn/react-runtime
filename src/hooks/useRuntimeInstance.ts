import * as React from 'react';
import { Layer, ManagedRuntime } from 'effect';
import { v4 as uuid } from 'uuid';
import type {
  Config,
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
    // this.log(null, 'initialized');
    console.log('Store initialized');
  }

  static of() {
    return new Store();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instances = new Map<string, RuntimeInstance<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private contextToId = new Map<RuntimeContext<any>, string>();
  private disposalTimeouts = new Map<string, NodeJS.Timeout>();
  private listeners = new Map<string, () => void>();
  private loggers = new Map<string, (msg: string) => void>();

  private log(config: Config, message: string) {
    if (config.debug) {
      console.log(`[${config.componentName}] ${message}`);
    }
  }

  // private setLogger(config: Config) {
  // const logger = config.debug
  //   ? (msg: string) => console.log(`[${config.componentName}] ${msg}`)
  //   : () => {};
  //   this.loggers.set(config.id, logger);

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
      id: uuid(),
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
    const existingId = this.contextToId.get(context);
    this.updateTimeout(config);

    if (existingId) {
      const existingInstance = this.instances.get(existingId);
      if (config.fresh && existingInstance && !existingInstance.isDisposed) {
        this.log(
          config,
          `creating runtime with fresh:true for ${config.id}, replacing ${existingId}`
        );
        const newInstance = this.createInstance(context.layer, config);

        if (options.notify) this.notifyById(config.id);
        if (config.disposeStrategy === 'dispose') {
          setTimeout(() => {
            void existingInstance.dispose();
            existingInstance.isDisposed = true;
          }, 0);

          this.log(config, `disposed previous instance ${existingId}`);
        }
        this.instances.set(config.id, newInstance);
        this.contextToId.set(context, newInstance.id);
      } else if (options.update) {
        this.log(config, `reused existing runtime for ${existingId}`);
        this.updateInstance(config.id, config);
      }
    }

    if (!this.instances.has(config.id)) {
      this.log(config, `creating new runtime for ${config.id}`);
      const instance = this.createInstance(context.layer, config);
      this.instances.set(config.id, instance);
      this.contextToId.set(context, config.id);
      // if (options.notify) this.notifyById(config.id);
    }
  }

  public onUnmount<T>(_: RuntimeContext<T>, config: Config) {
    const instance = this.instances.get(config.id);
    if (!instance) return;
    this.log(config, `scheduled disposal for ${config.id}`);
    this.createTimeout(config, instance);
  }

  public updateInstance(id: string, config: Config) {
    const instance = this.instances.get(id);
    if (instance) {
      instance.config = config;
      this.log(config, `updated config for ${id}`);
    }
  }

  public subscribe<T>(context: RuntimeContext<T>, config: Config) {
    const existing = this.instances.get(config.id);
    if (!existing) this.onMount(context, config, { notify: false });

    return (listener: () => void) => {
      this.log(config, `subscribed ${config.id}`);
      this.listeners.set(config.id, listener);

      return () => {
        this.listeners.delete(config.id);
        this.log(config, `unsubscribed ${config.id}`);
      };
    };
  }

  public getSnapshot(id: string) {
    return () => {
      // this.log(id, `snapshot read for ${id}`);
      return this.instances.get(id);
    };
  }

  public getByInstanceId(id: string) {
    // this.log(id, `get instance by id ${id}`);
    return this.instances.get(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getByRuntimeCtx(ctx: RuntimeContext<any>) {
    const id = this.contextToId.get(ctx);
    // if (id) this.log(id, `get instance by context`);
    return id ? this.instances.get(id) : undefined;
  }

  private notifyById(id: string) {
    const listener = this.listeners.get(id);
    if (listener) {
      // this.log(id, `notify listener for ${id}`);
      listener();
    }
  }

  private notifyAll() {
    // this.log(null, `notifying all listeners`);
    this.listeners.forEach((listener) => listener());
  }

  public disposeAll() {
    // this.log(null, `disposing all runtimes`);
    this.instances.forEach((instance) => {
      void instance.dispose();
      // this.log(null, `disposed ${id}`);
    });
    this.instances.clear();
    this.contextToId.clear();
    this.listeners.clear();
    this.disposalTimeouts.forEach(clearTimeout);
    this.disposalTimeouts.clear();
  }
}

// considered private
const store = Store.of();

export const useRuntimeInstance = <T>(
  context: RuntimeContext<T>,
  config: Config
): RuntimeInstance<T> => {
  const configRef = React.useRef(config);
  const shouldUpdateRef = React.useRef(false);

  React.useEffect(() => {
    if (shouldUpdateRef.current) {
      store.onMount(context, config, { notify: true, update: false });
      shouldUpdateRef.current = false;
    }

    return () => {
      store.onUnmount(context, config);
      shouldUpdateRef.current = true;
    };
  }, [context]);

  if (!deepEqual(configRef.current, config)) {
    store.updateInstance(config.id, config);
    configRef.current = config;
  }

  const instance = React.useSyncExternalStore(
    store.subscribe(context, configRef.current),
    store.getSnapshot(configRef.current.id)
  );

  if (!instance) {
    throw new Error(
      `[useRuntimeInstance] Runtime for ID "${config.id}" could not be initialized.`
    );
  }

  return instance;
};
