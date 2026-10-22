import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for PWA installability and manifest update handling
if (typeof window !== 'undefined') {
  // Purge any outdated Service Worker caches immediately so updates reflect instantly
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key !== 'literal-osis-v4-network-first') {
          caches.delete(key);
        }
      });
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for updates on page load
          registration.update();

          // Listen for new service worker installation
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('[SW] New version activated, cache refreshed');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[SW] Service worker registration ignored:', err);
        });
    });
  }
}

