import { createUseSalt } from './hooks/useSalt';
import { useTreeFrameContext } from './hooks/useTreeFrameContext';
export { TreeFrameContext } from './hooks/useTreeFrameContext';
export {
  createTreeFrame,
  type TreeFrameParentNode,
} from './factories/TreeFrame';

export const useTreeFrame = () => {
  const frame = useTreeFrameContext();
  return Object.assign(frame, {
    useSalt: createUseSalt(frame.seq),
  });
};
