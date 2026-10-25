import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root')!;
const root = createRoot(container, {
  onRecoverableError(error, errorInfo) {
    // Gracefully handle recoverable concurrent render and hydration recoveries
    console.warn('[React Recoverable Work Loop Notice]:', error, errorInfo);
  },
});

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

