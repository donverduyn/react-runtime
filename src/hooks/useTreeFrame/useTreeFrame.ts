import { createUseSalt } from './hooks/useSalt';
import { useTreeFrameContext } from './hooks/useTreeFrameContext';

export const useTreeFrame = () => {
  const frame = useTreeFrameContext();
  return Object.assign(frame, {
    useSalt: createUseSalt(frame.seq),
  });
};
