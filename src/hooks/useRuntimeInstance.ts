import * as React from 'react';
import { Layer, ManagedRuntime } from 'effect';
import memoize from 'moize';
import { v4 as uuid } from 'uuid';
import type { Config } from 'components/common/types';
import { RuntimeInstance } from 'utils/context';
import { deepEqual } from 'utils/object';

const printLog = (config: Config, message: string) => {
  if (!config.debug) return;
  console.log(`[${config.componentName}] ${message}`);
};

const createRuntime = memoize(
  <T>(layer: Layer.Layer<T>, runtimeId: string, config: Config) => {
    printLog(config, `creating runtime ${runtimeId}`);
    const instance = ManagedRuntime.make(layer);
    return Object.assign(instance, { id: runtimeId }) as RuntimeInstance<T>;
  },
  // this prevents a second instantiation in strict mode inside the useState function, which gets disposed immediately, and it since it has no side effects, we are safe.
  { isShallowEqual: true, maxAge: 100, maxArgs: 2 }
);

/*
This hook creates a runtime and disposes it when the component is unmounted.
It is used by withRuntime to create a runtime for the context. 
This is both compatible with strict mode and fast refresh. 🚀
*/

export const useRuntimeInstance = <T>(
  layer: Layer.Layer<T>,
  config: Config
) => {
  // TODO: use useSyncExternalStore to keep track of runtime instances and dispose them based on postUnmountTTL. Rehydrate the runtime instances on mount (maybe we need a component name/id combo here). The idea is that we can control the rotation of runtime instances based on what's in the map. This way we can control how any concurrent mode pecularities affect it. This also means we would no longer need to memoize the factory in useState, because the defensive logic would be in the store, to prevent unwanted half executed rotations.

  const layerRef = React.useRef(layer);
  const shouldCreate = React.useRef(false);
  const runtimeId = React.useRef(uuid());
  const hasMounted = React.useRef(false);
  const configRef = React.useRef(config);

  const [runtime, setRuntime] = React.useState(() =>
    createRuntime(layerRef.current, runtimeId.current, config)
  );

  React.useEffect(() => {
    if (!deepEqual(configRef.current, config)) {
      printLog(config, `recreating runtime ${runtimeId.current}`);
      const newRuntime = Object.assign(ManagedRuntime.make(layer), {
        id: uuid(),
      });
      void runtime.dispose().then(() => {
        setRuntime(() => newRuntime);
        configRef.current = config;
        runtimeId.current = newRuntime.id;
      });
    }
  }, [config]);

  if (!hasMounted.current) {
    hasMounted.current = true;
  } else {
    printLog(config, `reusing runtime  ${runtimeId.current}`);
  }

  React.useEffect(() => {
    if (shouldCreate.current || layerRef.current !== layer) {
      layerRef.current = layer;
      shouldCreate.current = false;
      printLog(config, `recreating runtime ${runtimeId.current}`);
      const newRuntime = Object.assign(ManagedRuntime.make(layer), {
        id: uuid(),
      });
      runtimeId.current = uuid();
      setRuntime(() => newRuntime);
    }

    return () => {
      printLog(config, `disposing runtime ${runtimeId.current}`);
      setTimeout(() => void runtime.dispose(), 0);
      shouldCreate.current = true;
    };
  }, [layer]);

  return runtime;
};
