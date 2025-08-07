import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App id='1' />
  </StrictMode>
);

    const Component = () => {
      React.useEffect(() => {
        console.log('useEffect');
        return () => {
          console.log('useEffect cleanup')
        }
      }, []);
    };
