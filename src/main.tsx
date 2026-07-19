import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence } from 'framer-motion';
import App from './App.tsx';
import SplashScreen from './components/shared/SplashScreen.tsx';
import { PWA_UPDATE_EVENT } from './components/shared/PWAUpdatePrompt.tsx';
import './index.css';
import './styles/institutional-portals.css';

const SPLASH_SESSION_KEY = 'ccsf-institutional-splash-phase7';
const SERVICE_WORKER_UPDATE_INTERVAL = 60 * 60 * 1000;

function announceServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) return;
  window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT, { detail: { registration } }));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        announceServiceWorkerUpdate(registration);
        void registration.update().catch(() => undefined);

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              announceServiceWorkerUpdate(registration);
            }
          });
        });

        window.setInterval(() => {
          if (navigator.onLine) void registration.update().catch(() => undefined);
        }, SERVICE_WORKER_UPDATE_INTERVAL);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            void registration.update().catch(() => undefined);
          }
        });
      })
      .catch((error) => {
        console.error('[My CCSF] Service worker registration failed:', error);
      });
  });
}

const Root: React.FC = () => {
  const seenSplash = sessionStorage.getItem(SPLASH_SESSION_KEY) === 'true';
  const [showSplash, setShowSplash] = useState(!seenSplash);
  const [appReady, setAppReady] = useState(seenSplash);

  const handleSplashComplete = () => {
    sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
    setShowSplash(false);
    setAppReady(true);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="institutional-splash" onComplete={handleSplashComplete} minDuration={1200} />}
      </AnimatePresence>
      {appReady && <App />}
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
