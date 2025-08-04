// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ProviderEntry } from 'components/common/types';
import { PROVIDERS_PROP } from 'components/common/types';

const getStaticProviderList = <C extends React.FC<any>, R>(
  component: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] }
) => component[PROVIDERS_PROP] ?? ([] as ProviderEntry<R, C>[]);

export function useProviderEntries<C extends React.FC<any>, R>(
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
      // we currently only support a single reference (assuming a single withRuntime usage for a runtime)
      if (ref) dfs(ref, level + 1);
    });
  }

  dfs(component, 0);
  return graph.sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level;
    return a.index - b.index;
  });
}
