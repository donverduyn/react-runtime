import * as React from 'react';
import { Effect } from 'effect';
import type { RuntimeContext, RuntimeInstance, RuntimeKey } from '@/types';

export const createUse =
  <R, P>(
    localContext: RuntimeContext<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeKey, RuntimeInstance<any, P>>
  ) =>
    // consider whether we ant to filter away constituents or provide them through runtime method signature
  <A, E>(effect: Effect.Effect<A, E, R>, deps: React.DependencyList = []) => {
    const instance = instances.get(localContext.key)!;
    // think about wether we want to implement a more specific solution for updating downstream components when upstream dependencies change.

    // TODO:  instanceDeps is not very accurate, we should think what's the best way to guarantee updates when any dependencies change, but maybe scoping the instance map could already help at buildEntries.
    const instanceDeps = Array.from(instances.values()).filter(Boolean);
    return React.useMemo(
      () => instance.runtime.runSync(effect),
      [instanceDeps, instance, ...deps]
    );
  };
