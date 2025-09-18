import * as React from 'react';
import { useState } from 'react';

export const Child = React.memo(function Child() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <span data-testid='count'>{count}</span>
      <button
        data-testid='inc'
        // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
        onClick={() => setCount((c) => c + 1)}
        type='button'
      >
        Inc
      </button>
    </div>
  );
});
