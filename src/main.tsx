import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import App from "./App.tsx";
import SplashScreen from "./components/shared/SplashScreen.tsx";
import "./index.css";

const Root = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    // Check if user has visited before in this session
    const visited = sessionStorage.getItem('app-visited');
    if (visited) {
      setShowSplash(false);
      setHasVisited(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('app-visited', 'true');
    setShowSplash(false);
    setHasVisited(true);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && !hasVisited && (
          <SplashScreen onComplete={handleSplashComplete} minDuration={2500} />
        )}
      </AnimatePresence>
      {(!showSplash || hasVisited) && <App />}
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
