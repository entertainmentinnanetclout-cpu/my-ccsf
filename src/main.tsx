import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import App from "./App.tsx";
import SplashScreen from "./components/shared/SplashScreen.tsx";
import "./index.css";

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[App] Service Worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[App] New content available, refresh to update');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[App] Service Worker registration failed:', error);
      });
  });
}

const Root = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Check if this is the first visit in this session
    const hasSeenSplash = sessionStorage.getItem('splash-seen');
    
    if (hasSeenSplash) {
      // Skip splash for returning users in same session
      setShowSplash(false);
      setAppReady(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splash-seen', 'true');
    setShowSplash(false);
    setAppReady(true);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen 
            key="splash"
            onComplete={handleSplashComplete} 
            minDuration={4000}  // 4 seconds for premium experience
          />
        )}
      </AnimatePresence>
      {appReady && <App />}
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
