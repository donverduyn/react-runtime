import * as React from 'react';

export const useStableObject = <T extends object>(input: T) => {
  return React.useMemo(() => ({ ...input }), Object.values(input));
};
