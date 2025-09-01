import { render } from '@testing-library/react';
import type { RegisterId } from '@/types';
import { TreeContext2, useTreeContext2 } from './useTreeContext';

describe('useTreeContext', () => {
  it('should return the parent id from the context', () => {
    const value = 'test-parent-id' as RegisterId;
    const TestComponent: React.FC = () => {
      const parentId = useTreeContext2();
      return <div>{parentId}</div>;
    };

    const { getByText } = render(
      <TreeContext2.Provider value={value}>
        <TestComponent />
      </TreeContext2.Provider>
    );

    expect(getByText(value)).toBeDefined();
  });
});
