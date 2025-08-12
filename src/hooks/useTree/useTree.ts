import * as React from 'react';
import type { ComponentId, ParentId } from 'types';
import { createSingletonHook } from '../common/factories/SingletonFactory';
import { useTreeContext, useTreeContext2 } from './hooks/useTreeContext';

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
  subscribe: (id: ComponentId) => (callback: () => void) => () => void;
  getSnapshot: () => Map<string, TreeMapNode | null>;
  register: (id: ComponentId, parentId: ParentId) => void;
  unregister: (id: ComponentId) => void;
  getParent: (id: ComponentId) => ParentId | null;
  isRoot: (id: ComponentId) => boolean;
  getRoot: () => ComponentId | null;
  // emitById: (id: string) => void;
};

/**
 * Creates a new TreeMapNode.
 * @param {string} id - The unique identifier for the node.
 * @param {TreeMapMeta} [meta={}] - Optional metadata for the node.
 * @returns {TreeMapNode} The created TreeMapNode.
 */
export function createTreeMapNode(
  id: ParentId | ComponentId,
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
function createTreeMap(): TreeMapStore {
  const nodeMap: Map<string, TreeMapNode | null> = new Map();
  const childToParent: Map<ComponentId, ParentId> = new Map();
  const parentToChildren: Map<ParentId, ComponentId[]> = new Map();
  const listeners: Map<string, () => void> = new Map();

  function register(id: ComponentId, parentId: ParentId) {
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

  function dispose(id: ComponentId) {
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
  function unregister(id: ComponentId) {
    dispose(id);
  }

  function subscribe(id: ComponentId) {
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

  // function getChildren(parentId: ParentId): Set<ComponentId> {
  //   return parentToChildren.get(parentId) ?? new Set();
  // }

  function getAllDescendants(parentId: ParentId): SetIterator<ComponentId> {
    const result = new Set<ComponentId>();
    function traverse(currentId: ParentId) {
      const children = parentToChildren.get(currentId);
      if (children) {
        for (const childId of children) {
          result.add(childId);
          traverse(childId as unknown as ParentId);
        }
      }
    }
    traverse(parentId);
    return result.values();
  }

  function emitSubtree(parentId: ParentId) {
    const toUpdate = getAllDescendants(parentId);
    for (const id of toUpdate) {
      const cb = listeners.get(id);
      if (cb) cb();
    }
  }

  function getParent(id: ComponentId) {
    return childToParent.get(id) ?? null;
  }

  function getChildren(id: ParentId) {
    return parentToChildren.get(id) ?? [];
  }

  function isRoot(id: ComponentId) {
    return getParent(id) === '__ROOT__';
  }

  function getRoot() {
    return getChildren('__ROOT__' as ParentId)[0] ?? null;
  }

  return {
    subscribe,
    getSnapshot,
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

export const useTreeMap = (id: ComponentId): TreeMapStore => {
  const instance = useTreeMapInstance();
  useTreeMapBinding(id, instance);
  return instance;
};

export const useTreeMapBinding = (id: ComponentId, treeMap: TreeMapStore) => {
  const parentId = useTreeContext2();
  const parentNode = treeMap.getParent(id);

  // one time register on mount, at the root (first registration), parentId is __ROOT__,
  // afterwards, we pull parentId from context

  const register = React.useCallback(() => {
    if (parentId && parentNode === null) {
      treeMap.register(id, parentId);
    }
  }, [id, parentId, parentNode, treeMap]);

  // register synchronously
  register();

  React.useEffect(() => {
    register();
    // register again on remount or if parentId changes

    return () => treeMap.unregister(id);
  }, [id, parentId]);
};
