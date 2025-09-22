import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Root } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* @ts-expect-error //TODO: fix this */}
    <Root />
  </StrictMode>
);
