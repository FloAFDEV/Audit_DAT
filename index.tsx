import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Déclenchement d'une nouvelle compilation... (commit vide)
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Construct an absolute URL for the service worker to avoid cross-origin errors
    // in some execution environments. The path '/sw.js' ensures it's resolved from the root.
    const swUrl = new URL('/sw.js', window.location.origin).href;
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('PWA service worker registered with scope: ', registration.scope);
      })
      .catch(err => {
        console.error('Service worker registration failed: ', err);
      });
  });
}
