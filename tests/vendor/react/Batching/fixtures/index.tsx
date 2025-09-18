import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

// eslint-disable-next-line react-refresh/only-export-components
function TestComponent() {
  const [_, rerender] = React.useState(0);
  const countRef = React.useRef(0);
  const hasRun = React.useRef(false);

  if (!hasRun.current) {
    hasRun.current = true;
    setTimeout(() => {
      rerender(1);
    }, 0);
    setTimeout(() => {
      rerender(2);
    }, 1);
  }

  countRef.current += 1;
  return (
    <div>
      <span data-testid='count'>{countRef.current}</span>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
// eslint-disable-next-line vitest/require-hook
root.render(
  <StrictMode>
    <TestComponent />
  </StrictMode>
);
