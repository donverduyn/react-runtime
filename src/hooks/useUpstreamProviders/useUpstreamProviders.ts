// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from 'react';
import type { ProviderEntry } from 'types';
import { PROVIDERS_PROP } from 'types';

const getStaticProviderList = <R, C extends React.FC<any>>(
  component: C & { [PROVIDERS_PROP]?: ProviderEntry<R, any>[] }
) => component[PROVIDERS_PROP] ?? ([] as ProviderEntry<R, any>[]);

export function useUpstreamProviders<C extends React.FC<any>, R>(
  component: C,
  entry: ProviderEntry<R, C>
) {
  const graph: (ProviderEntry<any, any> & {
    level: number;
    index: number;
  })[] = [];
  const visited = new Set<React.FC<any>>();

  function dfs(cmp: React.FC<any>, level: number) {
    if (visited.has(cmp)) return;
    visited.add(cmp);

    const entries = getStaticProviderList<R, React.FC<any>>(cmp);
    const appendedRegistry =
      cmp === component ? entries.concat(entry) : entries;

    appendedRegistry.forEach((item, index) => {
      if (item.type === 'upstream') {
        dfs(item.module.reference(), level + 1);
      }
      // we currently only support a single reference (assuming a single withRuntime usage for a runtime)
      graph.push(Object.assign({}, item, { level, index }));
    });
  }

  dfs(component, 0);
  return graph.sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level;
    return a.index - b.index;
  });
}
