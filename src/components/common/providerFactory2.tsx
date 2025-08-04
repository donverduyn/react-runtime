// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { useComponentMap } from 'hooks/useComponentLookup/useComponentLookup';
import type { IsEqual, Merge } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { ParentIdContext } from 'hooks/common/useParentId';
import { createUse } from 'hooks/useRuntimeApi/hooks/use';
import { createFn } from 'hooks/useRuntimeApi/hooks/useFn';
import { createRun } from 'hooks/useRuntimeApi/hooks/useRun';
import type {
  ComponentId,
  ParentId,
  RuntimeKey,
} from 'hooks/useRuntimeProvider/types';
import { useRuntimeProvider } from 'hooks/useRuntimeProvider/useRuntimeProvider';
import {
  createElement,
  getDisplayName,
  copyStaticProperties,
  extractMeta,
} from 'utils/react';
import { isRuntimeModule } from 'utils/runtime';
import {
  type ExtractStaticComponent,
  type ExtractStaticProviders as ExtractStaticProviders,
  type RuntimeApi,
  type RuntimeModule,
  type ProviderEntry as ProviderEntry,
  type Config,
  type PROPS_PROP,
  type ExtractStaticProps,
  COMPONENT_PROP,
  PROVIDERS_PROP,
  type UPSTREAM_PROP,
  type TraverseDeps,
  type RuntimeInstance,
  type ProviderConfigFn,
  type PropsConfigFn,
} from './types';

export const defaultConfig = {
  debug: false,
  postUnmountTTL: 1000,
  env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  cleanupPolicy: 'onUnmount',
  replace: false,
} satisfies Partial<Config>;

// Helper functions for static property management
const getStaticProviderList = <C extends React.FC<any>, R>(
  component: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] }
) => component[PROVIDERS_PROP] ?? ([] as ProviderEntry<R, C>[]);

const getStaticComponent = <C extends React.FC<any>>(
  component: C & { [COMPONENT_PROP]?: React.FC<any> }
) => component[COMPONENT_PROP];

const hoistOriginalComponent = <
  C extends React.FC<any>,
  C1 extends React.FC<any>,
>(
  Wrapper: C & { [COMPONENT_PROP]?: C1 },
  target: C1
) => {
  Wrapper[COMPONENT_PROP] = target;
};

const hoistProviderList = <C extends React.FC<any>, R>(
  Wrapper: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] },
  entries: ProviderEntry<R, C>[]
) => {
  Wrapper[PROVIDERS_PROP] = entries as ExtractStaticProviders<C>;
};

function collectUpstreamProviders<C extends React.FC<any>, R>(
  component: C,
  entry: ProviderEntry<R, C>
) {
  const graph: (ProviderEntry<any, any> & {
    level: number;
    index: number;
  })[] = [];
  const visited = new Set<React.FC<any>>();

  function dfs(
    comp: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] },
    level: number
  ) {
    if (visited.has(comp)) return;
    visited.add(comp);

    const entries = getStaticProviderList<C, R>(comp);
    const appendedRegistry =
      comp === component ? entries.concat(entry) : entries;

    appendedRegistry.forEach((item, index) => {
      graph.push(Object.assign({}, item, { level, index }));

      if (item.type === 'props' || entry.type === 'props') {
        return;
      }
      const ref =
        item.module !== entry.module ? item.module.reference() : undefined;
      if (ref) dfs(ref, level + 1);
    });
  }

  dfs(component, 0);
  return graph.sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level;
    return a.index - b.index;
  });
}

const createProviderHocEntry = <R, C extends React.FC<any>>(
  entry: ProviderEntry<R, C>
): ProviderEntry<R, C> => entry;

// Processing context interface
interface ProcessingContext {
  props: any;
  mergedFromConfigs: Record<string, any>;
  instances: Map<RuntimeKey, RuntimeInstance<any>>;
  runtimeProvider: any;
  upstreamKeys: Set<RuntimeKey>;
  componentId: ComponentId;
  name: string;
}

// 1. Static property management
const StaticPropertyManager = {
  getProviderList: getStaticProviderList,
  getComponent: getStaticComponent,
  hoistComponent: hoistOriginalComponent,
  hoistProviderList: hoistProviderList,
  collectUpstream: collectUpstreamProviders,
};

// 2. Upstream dependency resolution with useSyncExternalStore
function useUpstreamDependencies(
  entries: (ProviderEntry<any, any> & { level: number })[],
  componentId: ComponentId,
  runtimeProvider: any
) {
  const instances = new Map<RuntimeKey, RuntimeInstance<any>>();
  const upstreamKeys = new Set<RuntimeKey>();

  // This should use useSyncExternalStore to watch for upstream changes
  entries
    .filter((item) => item.type === 'runtime' && item.level !== 0)
    .forEach((entry) => {
      const { module } = entry;
      const runtimeKey = module.context.key;
      const instance = runtimeProvider.getByKey(componentId, runtimeKey);
      if (instance) {
        instances.set(runtimeKey, instance);
        upstreamKeys.add(runtimeKey);
      }
    });

  return { instances, upstreamKeys };
}

// 3. Entry filtering logic
function filterEntries(
  entries: (ProviderEntry<any, any> & { level: number })[],
  upstreamKeys: Set<RuntimeKey>,
  isRoot: boolean
) {
  return entries.filter((entry) => {
    if (entry.type === 'runtime') {
      const runtimeKey = entry.module.context.key;
      return !upstreamKeys.has(runtimeKey);
    } else {
      // Only include upstream/props entries at root or level 0
      return isRoot || entry.level === 0;
    }
  });
}

// Runtime factory creation
function createRuntimeFactory(entry: any, context: ProcessingContext) {
  return (options: { returnOnly: boolean } = { returnOnly: false }) =>
    (overrides: Partial<Config> = {}) => {
      if (!options.returnOnly) {
        const instance = context.runtimeProvider.register(context.componentId, {
          entryId: entry.id,
          context: entry.module.context,
          config: overrides,
        });
        context.instances.set(entry.module.context.key, instance);
      }

      return {
        instance: context.instances.get(entry.module.context.key)!.runtime,
        use: createUse(entry.module.context, context.instances),
        useFn: createFn(entry.module.context, context.instances),
        useRun: createRun(entry.module.context, context.instances),
      };
    };
}

// Helper functions for error messages
function noUpstreamMessage(name: string, prop: unknown) {
  return `[${name}] "${String(
    prop
  )}" is undefined, because components are not rendered upstream in portable scenarios. This may cause inconsistent behavior.`;
}

function invalidDestructure(name: string, prop: unknown) {
  return `[${name}] Invalid destructure "${String(prop)}". Use "runtime" or "configure".`;
}
function processRuntimeWithConfig<R>(
  entry: any,
  context: ProcessingContext,
  runtimeFactory: any
) {
  const { module, configFn, type } = entry;

  const proxyArg = new Proxy(
    {},
    {
      get(_, prop) {
        const isAvailableUpstream = context.upstreamKeys.has(
          module.context.key
        );
        const factoryOptions = {
          returnOnly: type === 'upstream' && isAvailableUpstream,
        };

        if (prop === 'runtime') {
          return runtimeFactory(factoryOptions)();
        }
        if (prop === 'configure' && type === 'runtime') {
          return runtimeFactory(factoryOptions);
        }

        throw new Error(invalidDestructure(context.name, prop));
      },
    }
  );

  const currentProps = Object.assign(
    {},
    context.mergedFromConfigs,
    entry.level === 0 ? context.props : {}
  );

  const propsProxy = new Proxy(currentProps, {
    get(target, prop: string) {
      const value = target[prop as keyof typeof target];
      if (!(prop in currentProps)) {
        console.warn(noUpstreamMessage(context.name, prop));
      }
      return value;
    },
  });

  const maybeProps = configFn(
    proxyArg as {
      runtime: RuntimeApi<R>;
      configure: ReturnType<typeof runtimeFactory>;
    },
    propsProxy
  );

  if (maybeProps) {
    Object.assign(context.mergedFromConfigs, maybeProps);
  }
}

// 4. Entry processors by type
const EntryProcessors = {
  props: (entry: any, context: ProcessingContext) => {
    const currentProps = Object.assign(
      {},
      context.mergedFromConfigs,
      entry.level === 0 ? context.props : {}
    );

    Object.assign(
      context.mergedFromConfigs,
      entry.configFn?.(currentProps) ?? {}
    );
  },

  runtime: (entry: any, context: ProcessingContext) => {
    const runtimeFactory = createRuntimeFactory(entry, context);

    if (entry.configFn) {
      processRuntimeWithConfig(entry, context, runtimeFactory);
    } else {
      runtimeFactory()();
    }
  },

  upstream: (entry: any, context: ProcessingContext) => {
    const runtimeFactory = createRuntimeFactory(entry, context);

    if (entry.configFn) {
      processRuntimeWithConfig(entry, context, runtimeFactory);
    }
  },
};

// 5. Entry processing logic
function processEntries(
  entries: (ProviderEntry<any, any> & { level: number })[],
  context: Omit<ProcessingContext, 'mergedFromConfigs'>
) {
  let mergedFromConfigs = {};
  let previousLevel = 0;

  entries.forEach((entry) => {
    if (entry.level < previousLevel) mergedFromConfigs = {};
    previousLevel = entry.level;

    const processingContext = { ...context, mergedFromConfigs };
    const processor = EntryProcessors[entry.type];

    if (processor) {
      processor(entry, processingContext);
    }
  });

  return mergedFromConfigs;
}

// 6. Context provider wrapper component
const ProviderContextWrapper: React.FC<{
  readonly id: string;
  readonly target: React.FC<any>;
  readonly children: React.ReactNode;
}> = ({ id, target, children }) => {
  const componentMap = useComponentMap();

  componentMap.register(id as ComponentId, {
    name: getDisplayName(target),
  });

  React.useEffect(() => () => {
    componentMap.dispose(id as ComponentId);
  });

  return (
    <ParentIdContext.Provider value={id as ParentId}>
      {children}
    </ParentIdContext.Provider>
  );
};

// 7. Entry processor component
const EntryProcessor: React.FC<{
  readonly component: React.FC<any>;
  readonly entry: ProviderEntry<any, any>;
  readonly props: any;
  readonly target: React.FC<any>;
  readonly name: string;
}> = ({ component, entry, props, target, name }) => {
  const runtimeProvider = useRuntimeProvider(props.id as ComponentId);
  const entries = StaticPropertyManager.collectUpstream(component, entry);

  const { instances, upstreamKeys } = useUpstreamDependencies(
    entries,
    props.id as ComponentId,
    runtimeProvider
  );

  const filteredEntries = filterEntries(
    entries,
    upstreamKeys,
    runtimeProvider.isRoot()
  );

  const mergedFromConfigs = processEntries(filteredEntries, {
    props,
    instances,
    upstreamKeys,
    runtimeProvider,
    componentId: props.id as ComponentId,
    name,
  });

  const mergedProps = Object.assign(mergedFromConfigs, props);
  const children =
    createElement(target, mergedProps as never) ??
    (props.children as React.ReactNode) ??
    null;

  return <>{children}</>;
};

// 8. HOC metadata setup
function setupHOCMetadata<C extends React.FC<any>, R>(
  Wrapper: any,
  Component: C,
  entries: ProviderEntry<R, C>[],
  entry: ProviderEntry<R, C>,
  name: string,
  target: React.FC<any>
) {
  const meta = extractMeta(Component);
  const Memo = React.memo(Wrapper);
  Memo.displayName = getDisplayName(Component, name);

  copyStaticProperties(meta, Memo);
  StaticPropertyManager.hoistComponent(Memo, target);
  StaticPropertyManager.hoistProviderList(Memo, entries.concat(entry));

  return Memo;
}

// 9. Provider entry creation
function createProviderEntry(
  type: string,
  module: RuntimeModule<any> | undefined,
  configFn: any
) {
  const hocId = uuid();

  if (type === 'props') {
    return createProviderHocEntry({
      id: hocId,
      type: 'props',
      configFn: configFn as PropsConfigFn<any>,
    });
  } else {
    return createProviderHocEntry({
      id: hocId,
      type,
      module: module!,
      configFn: configFn as ProviderConfigFn<any, any>,
    });
  }
}

// 10. HOC creation
function createHOC<R, C extends React.FC<any>, TProps>(
  type: string,
  name: string,
  module: RuntimeModule<R> | undefined,
  configFn: any
) {
  return (Component: C) => {
    const target = StaticPropertyManager.getComponent(Component) ?? Component;
    const entries = StaticPropertyManager.getProviderList(Component);
    const entry = createProviderEntry(type, module, configFn);

    const Wrapper: React.FC<
      { readonly id: string } & Partial<React.ComponentProps<C>>
    > = (props) => {
      return (
        <ProviderContextWrapper id={props.id} target={target}>
          <EntryProcessor
            component={Component}
            entry={entry}
            name={name}
            props={props}
            target={target}
          />
        </ProviderContextWrapper>
      );
    };

    return setupHOCMetadata(
      Wrapper,
      Component,
      entries,
      entry,
      name,
      target
    ) as typeof Wrapper & {
      [UPSTREAM_PROP]: TraverseDeps<{
        [PROVIDERS_PROP]: [...ExtractStaticProviders<C>, typeof module];
      }>;
      [PROVIDERS_PROP]: IsEqual<typeof type, 'props'> extends true
        ? ExtractStaticProviders<C>
        : [...ExtractStaticProviders<C>, typeof module];
      [COMPONENT_PROP]: ExtractStaticComponent<C>;
      [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
    };
  };
}

// 11. Main factory
export const providerFactory = <Type extends 'runtime' | 'upstream' | 'props'>(
  type: Type,
  name: string
) => {
  const create = <
    R,
    C extends React.FC<any>,
    TProps extends Record<string, unknown> | undefined,
  >(
    moduleOrFn: RuntimeModule<R> | PropsConfigFn<C, TProps>,
    configFn?: ProviderConfigFn<R, C, TProps>
  ) => {
    const isModuleFirst = isRuntimeModule<R>(moduleOrFn);
    const module = isModuleFirst ? moduleOrFn : undefined;
    const fn = !isModuleFirst ? moduleOrFn : configFn;
    return createHOC<R, C, TProps>(type, name, module, fn);
  };

  return create;
};
