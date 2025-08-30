import * as React from 'react';
import type { RegisterId, ScopeId } from 'types';
import { createSingletonHook } from '../common/factories/SingletonFactory';

/**
 * Represents a node in the TreeMap.
 */
type TreeMapNode = {
  id: string;
  meta: TreeMapMeta;
};

/**
 * Represents the meta data for a TreeMapNode.
 */
type TreeMapMeta = {
  [key: string]: unknown;
};

/**
 * Store interface for managing TreeMap nodes and subscriptions.
 */
export type TreeMapStore = {
  // subscribe: (id: RegisterId) => (callback: () => void) => () => void;
  // getSnapshot: () => Map<string, TreeMapNode | null>;
  update: (id: RegisterId, parentId: RegisterId) => void
  register: (id: RegisterId, parentId: RegisterId) => void;
  unregister: (id: RegisterId) => void;
  getParent: (id: RegisterId) => RegisterId | null;
  isRoot: (id: RegisterId) => boolean;
  getRoot: () => RegisterId | null;
  // emitById: (id: string) => void;
};

/**
 * Creates a new TreeMapNode.
 * @param {string} id - The unique identifier for the node.
 * @param {TreeMapMeta} [meta={}] - Optional metadata for the node.
 * @returns {TreeMapNode} The created TreeMapNode.
 */
export function createTreeMapNode(
  id: RegisterId,
  meta: TreeMapMeta = {}
): TreeMapNode {
  return {
    id,
    meta,
  };
}

/**
 * Creates a TreeMapStore for managing TreeMap nodes and subscriptions.
 * @returns {TreeMapStore} The created TreeMapStore instance.
 */
function createTreeMap(_: ScopeId): TreeMapStore {
  const nodeMap: Map<string, TreeMapNode | null> = new Map();
  const childToParent: Map<RegisterId, RegisterId> = new Map();
  const parentToChildren: Map<RegisterId, RegisterId[]> = new Map();
  const listeners: Map<string, () => void> = new Map();

  function register(id: RegisterId, parentId: RegisterId) {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, createTreeMapNode(id));
    }
    if (!childToParent.has(id)) {
      childToParent.set(id, parentId);
    }
    if (!parentToChildren.has(parentId)) {
      parentToChildren.set(parentId, []);
    }
    parentToChildren.get(parentId)!.push(id);
  }

  function update(id: RegisterId, parentId: RegisterId) {
    const currentParentId = childToParent.get(id);
    if (currentParentId) {
      childToParent.set(id, parentId);
      parentToChildren
        .get(currentParentId)
        ?.splice(parentToChildren.get(currentParentId)!.indexOf(id), 1);
    }
    childToParent.set(id, parentId);
    if (!parentToChildren.has(parentId)) {
      parentToChildren.set(parentId, []);
    }
    parentToChildren.get(parentId)!.push(id);
  }

  function dispose(id: RegisterId) {
    // Remove from childToParent and nodeMap
    const parentId = childToParent.get(id);
    childToParent.delete(id);
    nodeMap.delete(id);

    // Remove from parent's set of children
    if (parentId && parentToChildren.has(parentId)) {
      const children = parentToChildren.get(parentId)!;
      parentToChildren.set(
        parentId,
        children.filter((child) => child !== id)
      );
    }

    // Remove listener
    listeners.delete(id);
  }

  // Every components cleans up after itself, based on some dispose timeout. There is also a case where we directly unregister (this happens when the id has changed, we need to handle this specifically)
  // The idea is that we unregister without notification, because subtrees will be notified after the parent rerenders with a new id, or unmounted (which would clean the subtree anyway, so no need to notify).
  function unregister(id: RegisterId) {
    dispose(id);
  }

  function subscribe(id: RegisterId) {
    return (callback: () => void) => {
      listeners.set(id, callback);
      return () => listeners.delete(id);
    };
  }

  // function emitById(id: string) {
  // const callback = listeners.get(id);
  // if (callback) callback();
  // }

  function getSnapshot() {
    return nodeMap;
  }

  // function getChildren(parentId: RegisterId): Set<RegisterId> {
  //   return parentToChildren.get(parentId) ?? new Set();
  // }

  function getAllDescendants(parentId: RegisterId): SetIterator<RegisterId> {
    const result = new Set<RegisterId>();
    function traverse(currentId: RegisterId) {
      const children = parentToChildren.get(currentId);
      if (children) {
        for (const childId of children) {
          result.add(childId);
          traverse(childId as unknown as RegisterId);
        }
      }
    }
    traverse(parentId);
    return result.values();
  }

  function emitSubtree(parentId: RegisterId) {
    const toUpdate = getAllDescendants(parentId);
    for (const id of toUpdate) {
      const cb = listeners.get(id);
      if (cb) cb();
    }
  }

  function getParent(id: RegisterId) {
    return childToParent.get(id) ?? null;
  }

  function getChildren(id: RegisterId) {
    return parentToChildren.get(id) ?? [];
  }

  function isRoot(id: RegisterId) {
    return getParent(id) === '__ROOT__';
  }

  function getRoot() {
    return getChildren('__ROOT__' as RegisterId)[0] ?? null;
  }

  return {
    // subscribe,
    // getSnapshot,
    update,
    register,
    isRoot,
    getRoot,
    unregister,
    getParent,
    // emitById,
  };
}

/**
 * Singleton hook to get the TreeMapStore instance.
 * @returns {TreeMapStore} The TreeMapStore instance.
 */
const useTreeMapInstance = createSingletonHook(createTreeMap);

export const useTreeMap = (
  scopeId: ScopeId,
  id?: RegisterId,
  parentId?: RegisterId | null
): TreeMapStore => {
  const instance = useTreeMapInstance(scopeId);
  // TODO: think about moving register logic into tree map instance
  if (id && parentId) useTreeMapBinding(id, parentId, instance);
  return instance;
};

export const getTreeMap = (scopeId: ScopeId) => {
  return useTreeMapInstance(scopeId);
};

export const useTreeMapBinding = (
  id: RegisterId,
  parentId: RegisterId,
  treeMap: TreeMapStore
) => {
  const parentNode = treeMap.getParent(id);

  // one time register on mount, at the root (first registration), parentId is __ROOT__,
  // afterwards, we pull parentId from context

  const register = React.useCallback(() => {
    if (parentId && parentNode === null) {
      treeMap.register(id, parentId);
    }
  }, [id, parentId, parentNode, treeMap]);

  // register synchronously (registration happens only once, even with multiple calls)
  register();

  React.useEffect(() => {
    register();
    // register again on remount or if parentId changes

    return () => treeMap.unregister(id);
  }, [id, parentId]);

  return register;
};
