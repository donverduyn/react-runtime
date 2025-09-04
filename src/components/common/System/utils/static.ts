// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DRYRUN_ID_PROP,
  PROVIDERS_PROP,
  type ProviderEntry,
  COMPONENT_PROP,
  ID_PROP,
  type ExtractStaticProviders,
  PROPS_PROP,
  type IdProp,
  type ResolvedProviderEntry,
  type ScopeId,
} from '@/types';

export const getStaticProviderList = <
  C extends React.FC<any>,
  R,
  P = Partial<IdProp> & React.ComponentProps<C>,
>(
  component: C & {
    [PROVIDERS_PROP]?: ProviderEntry<R, C, P>[];
  },
  providers?: ProviderEntry<R, C, P>[]
): ResolvedProviderEntry<R, C, P>[] =>
  (component[PROVIDERS_PROP] ?? [])
    .concat(providers ?? [])
    .map((item, index) => Object.assign({}, item, { level: 0, index }));

export const getStaticComponent = <C extends React.FC<any>>(
  component: C & { [COMPONENT_PROP]?: React.FC<any> }
) => component[COMPONENT_PROP];

export const getStaticProps = <C extends React.FC<any>>(
  component: C & { [PROPS_PROP]?: Record<string, any> }
) => component[PROPS_PROP];

export const getStaticDeclarationId = <C extends React.FC<any>>(
  component: C & { [ID_PROP]?: string }
): string | undefined => component[ID_PROP];

export const hoistDeclarationId = <C extends React.FC<any>>(
  Wrapper: C & { [ID_PROP]?: string },
  id: string
) => {
  Wrapper[ID_PROP] = id;
};

export const getStaticDryRunId = <C extends React.FC<any>>(
  component: C & { [DRYRUN_ID_PROP]?: ScopeId | null }
): ScopeId | null => component[DRYRUN_ID_PROP] ?? null;

export const hoistDryRunId = <C extends React.FC<any>>(
  Wrapper: C & { [DRYRUN_ID_PROP]?: ScopeId | null },
  id: ScopeId | null
) => {
  Wrapper[DRYRUN_ID_PROP] = id;
};

export const hoistOriginalComponent = <
  C extends React.FC<any>,
  C1 extends React.FC<any>,
>(
  Wrapper: C & { [COMPONENT_PROP]?: C1 },
  target: C1
) => {
  Wrapper[COMPONENT_PROP] = target;
};

export const hoistProviderList = <C extends React.FC<any>, R>(
  Wrapper: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] },
  entries: ProviderEntry<R, C>[]
) => {
  Wrapper[PROVIDERS_PROP] = entries as ExtractStaticProviders<C>;
};
