import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Zap, Bell, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed the prompt recently
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay for better UX
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isInstalled || !showPrompt) return null;

  const features = [
    { icon: Zap, text: 'Fast & responsive' },
    { icon: Bell, text: 'Push notifications' },
    { icon: Wifi, text: 'Works offline' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-96"
      >
        <div 
          className="relative overflow-hidden rounded-2xl border border-border/50 p-6"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)/0.95) 100%)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Icon */}
          <motion.div
            className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, hsl(0 72% 51%) 0%, hsl(0 84% 40%) 100%)',
              boxShadow: '0 10px 30px -5px hsl(0 72% 51% / 0.4)',
            }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Smartphone className="h-7 w-7 text-white" />
          </motion.div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Install My CCSF
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isIOS 
              ? 'Tap the share button and select "Add to Home Screen"'
              : 'Add to your home screen for quick access'
            }
          </p>

          {/* Features */}
          <div className="flex gap-4 mb-5">
            {features.map(({ icon: Icon, text }, index) => (
              <motion.div
                key={text}
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{text}</span>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          {!isIOS && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="flex-1"
              >
                Maybe later
              </Button>
              <Button
                onClick={handleInstall}
                className="flex-1 gap-2"
                style={{
                  background: 'linear-gradient(135deg, hsl(0 72% 51%) 0%, hsl(0 84% 40%) 100%)',
                }}
              >
                <Download className="h-4 w-4" />
                Install
              </Button>
            </div>
          )}

          {isIOS && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl">📤</div>
              <p className="text-xs text-muted-foreground">
                Tap the <strong>Share</strong> button below, then scroll and tap <strong>"Add to Home Screen"</strong>
              </p>
            </div>
          )}

          {/* Decorative gradient */}
          <div 
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(0 72% 51%) 0%, transparent 70%)',
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
