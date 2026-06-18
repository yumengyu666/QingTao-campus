import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { registerSW } from './registerSW';
import '@/styles/globals.css';

// Service Worker — 离线缓存 (生产环境启用)
if (import.meta.env.PROD) {
  registerSW();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
