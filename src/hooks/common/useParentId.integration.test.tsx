import { render } from '@testing-library/react';
import type { ParentId } from 'hooks/useRuntimeProvider/types';
import { ParentIdContext, useParentId } from './useParentId';

describe('useParentId', () => {
  it('should return the parent id from the context', () => {
    const value = 'test-parent-id' as ParentId;
    const TestComponent: React.FC = () => {
      const parentId = useParentId();
      return <div>{parentId}</div>;
    };

    const { getByText } = render(
      <ParentIdContext.Provider value={value}>
        <TestComponent />
      </ParentIdContext.Provider>
    );

    expect(getByText(value)).toBeDefined();
  });
});
