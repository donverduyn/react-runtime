import * as React from 'react';
import { useParentId } from 'hooks/common/useParentId';
import { createSingletonHook } from '../../common/factories/SingletonFactory';
import type { ComponentId, LookupTable, ParentId } from '../types';

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
type TreeMapStore = {
  subscribe: (id: ComponentId) => (callback: () => void) => () => void;
  getSnapshot: () => LookupTable<string, TreeMapNode | null>;
  register: (id: ComponentId, parentId: ParentId) => void;
  unregister: (id: ComponentId) => void;
  getParent: (id: ComponentId) => ParentId | null;
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
  const nodeMap: LookupTable<string, TreeMapNode | null> = new Map();
  const childToParent: LookupTable<ComponentId, ParentId> = new Map();
  const parentToChildren: LookupTable<ParentId, Set<ComponentId>> = new Map();
  const listeners: Map<string, () => void> = new Map();

  function register(id: ComponentId, parentId: ParentId) {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, createTreeMapNode(id));
    }
    if (!childToParent.has(id)) {
      childToParent.set(id, parentId);
    }
    if (!parentToChildren.has(parentId)) {
      parentToChildren.set(parentId, new Set());
    }
    parentToChildren.get(parentId)!.add(id);
  }

  function dispose(id: ComponentId) {
    // Remove from childToParent and nodeMap
    const parentId = childToParent.get(id);
    childToParent.delete(id);
    nodeMap.delete(id);

    // Remove from parent's set of children
    if (parentId && parentToChildren.has(parentId)) {
      const children = parentToChildren.get(parentId)!;
      children.delete(id);
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

  function getParent(id: ComponentId): ParentId | null {
    return childToParent.get(id) ?? null;
  }

  return {
    subscribe,
    getSnapshot,
    register,
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
  const parentId = useParentId();
  const parentNode = treeMap.getParent(id);

  // one time register on mount, skip at root when parentId is null
  if (parentId && parentNode === null) {
    treeMap.register(id, parentId);
  }

  React.useEffect(() => {
    const parentNode = treeMap.getParent(id);
    if (parentId && parentNode === null) {
      treeMap.register(id, parentId);
    }

    return () => treeMap.unregister(id);
  }, [id, parentId]);
};
