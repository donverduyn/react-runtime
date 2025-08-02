import * as React from 'react';
import { render } from '@testing-library/react';
import { useParentId, ParentIdContext } from '../../common/useParentId';
import type { ComponentId, ParentId } from '../types';
import { useTreeMap } from './useTreeMap';

const TestComponent: React.FC<{
  readonly children?: React.ReactNode;
  readonly id: string;
}> = ({ children, id }) => {
  const parentId = useParentId();
  // useComponentId({ id });

  return (
    <ParentIdContext.Provider value={id as ParentId}>
      <p>{`id: ${id}, parent: ${parentId}`}</p>
      {children}
    </ParentIdContext.Provider>
  );
};

const TestRootComponent: React.FC<{ readonly id: string }> = ({ id }) => {
  const treeMap = useTreeMap(id as ComponentId);
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
