// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PROVIDERS_PROP,
  type ProviderEntry,
  COMPONENT_PROP,
  ID_PROP,
  type ExtractStaticProviders,
} from 'types';

export const getStaticProviderList = <C extends React.FC<any>, R>(
  component: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] }
) => component[PROVIDERS_PROP] ?? ([] as ProviderEntry<R, C>[]);

export const getStaticComponent = <C extends React.FC<any>>(
  component: C & { [COMPONENT_PROP]?: React.FC<any> }
) => component[COMPONENT_PROP];

export const getStaticDeclarationId = <C extends React.FC<any>>(
  component: C & { [ID_PROP]?: string }
): string | undefined => component[ID_PROP];

export const hoistDeclarationId = <C extends React.FC<any>>(
  Wrapper: C & { [ID_PROP]?: string },
  id: string
) => {
  Wrapper[ID_PROP] = id;
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
