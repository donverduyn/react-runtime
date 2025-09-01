import * as React from 'react';
import { v4 as uuid } from 'uuid';
import type { ScopeId } from 'types';
import { isShallowEqual } from 'utils/object';
import { getDisplayName } from 'utils/react';
import { createSingletonHook } from './factories/SingletonFactory';

const useStableIdMap = createSingletonHook(() => new StableIdMap());

export function useStableId<P extends Record<string, unknown>>(
  props: P,
  prefix: string = 'default'
): string {
  const scopeId = 'scope' as ScopeId;
  const stableIdMap = useStableIdMap(scopeId);
  const prevProps = React.useRef<P | null>(null);
  const idRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (idRef.current === null) {
      const id = stableIdMap.getIdFromProps(prefix, prevProps.current!);
      idRef.current = id;
    }
    prevProps.current = props;
    return () => {
      idRef.current = null;
      setTimeout(() => {
        stableIdMap.removeId(prefix, prevProps.current!);
      }, 1000);
    };
  }, [props, prefix, stableIdMap]);

  if (idRef.current === null) {
    const id = stableIdMap.getIdFromProps(prefix, props);
    if (id === null) {
      const newId = uuid();
      stableIdMap.addId(prefix, props, newId);
      idRef.current = newId;
    } else {
      idRef.current = id;
    }
  }

  if (prevProps.current !== null && !isShallowEqual(prevProps.current, props)) {
    const id = stableIdMap.getIdFromProps(prefix, prevProps.current);
    if (id) idRef.current = id;
    stableIdMap.updateProps(prefix, prevProps.current, props);
  }

  return idRef.current;
}

type Identifier = { props: Record<string, unknown>; id: string };

class StableIdMap {
  private map = new Map<string, Identifier[]>();

  getIdFromProps(prefix: string, props: Record<string, unknown>) {
    const arr = this.map.get(prefix) ?? [];
    const item = arr.find((item) => isShallowEqual(item.props, props));
    return item ? item.id : null;
  }

  addId(prefix: string, props: Record<string, unknown>, id: string) {
    const arr = this.map.get(prefix) ?? [];
    arr.push({ props, id });
    this.map.set(prefix, arr);
  }

  removeId(prefix: string, props: Record<string, unknown>) {
    const arr = this.map.get(prefix) ?? [];
    const idx = arr.findIndex((item) => isShallowEqual(item.props, props));
    if (idx !== -1) {
      arr.splice(idx, 1);
      this.map.set(prefix, arr);
    }
  }

  updateProps(
    prefix: string,
    oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>
  ) {
    const arr = this.map.get(prefix) ?? [];
    const idx = arr.findIndex((item) => isShallowEqual(item.props, oldProps));
    if (idx !== -1) {
      arr[idx].props = newProps;
      this.map.set(prefix, arr);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withReactId<C extends React.FC<any>>(
  Target: C
): React.FC<React.ComponentProps<C>> {
  function Component(props: React.ComponentProps<C>) {
    const indexes =
      ((props.__reactid as string | undefined) ?? '')
        .split('@')[1]
        ?.split('.') ?? [];

    const parentPath = ((props.__reactid as string | undefined) ?? '').split(
      '→'
    );
    if (parentPath[0] === '') parentPath.shift();
    parentPath.pop();
    const mergedPath = parentPath.join('→');

    const rawJSX = Target(props);
    return applyIds(
      rawJSX,
      [mergedPath, getDisplayName(Target)],
      props,
      indexes.length > 0 ? indexes : [0]
    );
  }
  Component.displayName = getDisplayName(Target, 'withReactId');
  return Component;
}

type Path = Array<string | number>;

function applyIds(
  node: React.ReactNode | Promise<React.ReactNode>,
  namePath: string[] = [],
  props: unknown,
  path: Path = [0]
): React.ReactElement {
  if (!React.isValidElement(node)) return node as unknown as React.ReactElement;

  const componentName =
    typeof node.type === 'string'
      ? node.type
      : getDisplayName(node.type as React.FC);

  const fullNamePath = [...namePath, componentName];
  const id = generateStableId(fullNamePath, path, props);
  const originalChildren = (node.props as React.PropsWithChildren).children;

  const children = React.Children.map(originalChildren, (child, index) =>
    applyIds(child, fullNamePath, node.props, [...path, index])
  );

  return React.cloneElement(
    node,
    Object.assign({}, node.props, { __reactid: id }),
    children
  );
}

function generateStableId(
  namePath: string[],
  path: Path,
  props: unknown
): string {
  const { children, ...restProps } = props as Record<string, unknown>;
  const propHash = JSON.stringify(restProps);
  const pathString = path.join('.');
  return `${namePath.join('→')}@${pathString}|${propHash}`;
}

/**
 * Recursively collects all __reactId properties from a React element tree into an array.
 * @param node The root React node to traverse.
 * @returns An array of all __reactId values found in the tree.
 */
export function collectReactIds(node: React.ReactNode): string[] {
  const ids: string[] = [];
  function traverse(n: React.ReactNode) {
    if (React.isValidElement(n)) {
      const props = n.props as {
        __reactid?: unknown;
        children?: React.ReactNode;
      };
      if (typeof props.__reactid === 'string') {
        ids.push(props.__reactid);
      }
      React.Children.forEach(props.children, traverse);
    }
  }
  traverse(node);
  return ids;
}
