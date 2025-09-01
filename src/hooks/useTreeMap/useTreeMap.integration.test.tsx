import * as React from 'react';
import { render } from '@testing-library/react';
import type { RegisterId, IdProp, ScopeId } from '@/types';
import { createTreeFrame } from 'hooks/useTreeFrame/factories/TreeFrame';
import {
  TreeFrameContext,
  useTreeFrameContext,
} from 'hooks/useTreeFrame/hooks/useTreeFrameContext';
import { combineV5 } from 'utils/hash';
import { useTreeMap } from './useTreeMap';

const scopeId = 'scope' as ScopeId;
const declId = 'declaration' as RegisterId;
const TestComponent: React.FC<
  { readonly children?: React.ReactNode } & Partial<IdProp>
> = ({ children, id } = { id: 'default' }) => {
  const frame = useTreeFrameContext();
  const childFrame = createTreeFrame(frame, {
    registerId: id as RegisterId,
    cumSig: combineV5(frame.parent.cumSig, declId, id!),
  });

  return (
    <TreeFrameContext.Provider value={childFrame}>
      <p>{`id: ${id!}, parent: ${frame.parent.registerId}`}</p>
      {children}
    </TreeFrameContext.Provider>
  );
};

const TestRootComponent: React.FC<Partial<IdProp>> = ({ id }) => {
  const treeMap = useTreeMap(scopeId, id as RegisterId);
  React.useEffect(() => {
    // console.log(
    //   'TreeMap Store initialized:',
    //   treeMap.getSnapshot(),
    //   Date.now()
    // );
    return () => {
      setTimeout(() => {
        // console.log('TreeMap Post unmount', treeMap.getSnapshot(), Date.now());
      }, 0);
    };
  }, [treeMap]);
  return (
    <TestComponent id='root'>
      <TestComponent id='child'>
        <TestComponent id='grandchild' />
      </TestComponent>
    </TestComponent>
  );
};

describe('useTreeMap', () => {
  it('should provide correct parentId via context', () => {
    const screen = render(<TestRootComponent id='root' />);
    // screen.debug();
    // Use screen.getByText to check for each id and parent
    expect(screen.getByText('id: root, parent: __ROOT__')).toBeInTheDocument();
    expect(screen.getByText('id: child, parent: root')).toBeInTheDocument();
    expect(
      screen.getByText('id: grandchild, parent: child')
    ).toBeInTheDocument();
  });

  it.todo('should traverse up the tree using useFindUpTree');
});
