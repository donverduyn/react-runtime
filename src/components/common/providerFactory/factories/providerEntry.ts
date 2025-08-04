import type {
  RuntimeModule,
  ProviderConfigFn,
  PropsConfigFn,
  ProviderEntry,
} from '../types';

export const createProviderEntry = <
  R,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  C extends React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CRef extends React.FC<any>,
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
>(
  hocId: string,
  providerType: 'props' | 'runtime' | 'upstream',
  module: RuntimeModule<R, CRef> | undefined,
  configFn?: ProviderConfigFn<R, C> | PropsConfigFn<C>
): ProviderEntry<R, C> => {
  if (providerType === 'props') {
    return {
      id: hocId,
      type: 'props',
      configFn: configFn as PropsConfigFn<C>,
    };
  } else {
    return {
      id: hocId,
      type: providerType,
      module: module!,
      configFn: configFn as ProviderConfigFn<R, C>,
    };
  }
};
