import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
// eslint-disable-next-line vitest/require-hook
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
