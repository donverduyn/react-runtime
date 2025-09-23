import * as React from 'react';
import { createRootTreeFrame, type TreeFrame } from '../factories/TreeFrame';

export const TreeFrameContext = React.createContext<TreeFrame | null>(null);

export function useTreeFrameContext() {
  return React.useContext(TreeFrameContext) ?? createRootTreeFrame();
}
