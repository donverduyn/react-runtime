import type { TreeMapStore } from 'hooks/useTreeMap/useTreeMap';
import type { DeclarationId, RegisterId, ScopeId } from 'types';
import { useComponentMap } from './hooks/useComponentMap';

export type ComponentTreeApi = {
  register: (id: RegisterId, declarationId: DeclarationId) => void;
  resolveAncestors: (id: RegisterId) => DeclarationId[];
  getDeclarationId: (id: RegisterId | null) => DeclarationId | null;
  getInstanceIds: (declarationId: DeclarationId) => RegisterId[];
};

export const useComponentTree = (
  scopeId: ScopeId,
  treeMap: TreeMapStore
): ComponentTreeApi => {
  const componentMap = useComponentMap(scopeId);

  // this is used by DryRunTracker to create candidates
  function resolveAncestors(id: RegisterId) {
    const ancestors: DeclarationId[] = [];
    function traverse(currentId: RegisterId | null) {
      if (!currentId || currentId === '__ROOT__') return;
      const declarationId = componentMap.getDeclarationId(currentId);
      if (!declarationId) throw new Error(noDeclarationMessage(currentId));
      ancestors.push(declarationId);
      const parent = treeMap.getParent(currentId);
      traverse(parent);
    }
    traverse(id as RegisterId | null);
    return ancestors;
  }

  function register(id: RegisterId, declarationId: DeclarationId) {
    const parentId = treeMap.getParent(id);
    const parentDeclarationId = componentMap.getDeclarationId(parentId);
    if (parentId !== '__ROOT__' && !parentDeclarationId)
      throw new Error(noDeclarationMessage(id));

    componentMap.register(id, declarationId);
  }

  return {
    register,
    resolveAncestors,
    getInstanceIds: componentMap.getInstanceIds,
    getDeclarationId: componentMap.getDeclarationId,
  };
};

export const getComponentTree = (scopeId: ScopeId, treeMap: TreeMapStore) => {
  return useComponentTree(scopeId, treeMap);
};

const noDeclarationMessage = (id: RegisterId) =>
  `No declarationId found for component id: ${id}`;
