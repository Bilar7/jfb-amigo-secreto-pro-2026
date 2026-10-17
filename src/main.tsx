import React from 'react';
import { createRoot } from 'react-dom/client';
import { setBackend } from './services/backend';
import { firebaseBackend } from './services/firebaseBackend';
import App from './App';
import './utils/pwa';
import './styles.css';

setBackend(firebaseBackend);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA: regista o service worker (só fora do computador de desenvolvimento)
if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
