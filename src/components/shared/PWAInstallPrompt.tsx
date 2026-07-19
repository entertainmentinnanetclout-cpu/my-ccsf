import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, RefreshCw, ShieldCheck, Smartphone, X, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { BRAND } from '@/brand';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'ccsf-pwa-install-dismissed-at';
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function PWAInstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());
  const isIOS = useMemo(() => isIOSDevice(), []);
  const authSurface = location.pathname === '/auth' || location.pathname === '/pilot/auth';

  useEffect(() => {
    if (installed || authSurface) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const dismissedRecently = dismissedAt > 0
      && (Date.now() - dismissedAt) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    if (dismissedRecently) return;

    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setShowPrompt(true), 4500);
    };
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      schedule();
    };
    const handleInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    if (isIOS) schedule();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [authSurface, installed, isIOS]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowPrompt(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'dismissed') localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (installed || authSurface || !showPrompt || (!isIOS && !deferredPrompt)) return null;

  const features = [
    { icon: Zap, text: 'Faster launch' },
    { icon: RefreshCw, text: 'Update ready' },
    { icon: ShieldCheck, text: 'CCSF identity' },
  ];

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-96"
        role="dialog"
        aria-modal="false"
        aria-labelledby="pwa-install-title"
        data-testid="pwa-install-prompt"
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#F2A900]/45 bg-card p-6 shadow-2xl">
          <button type="button" onClick={dismiss} className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted" aria-label="Dismiss installation prompt">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#002F6C] shadow-lg">
            <img src={BRAND.assets.ccsfLogo} alt="" aria-hidden="true" className="h-11 w-11 object-contain" />
          </div>

          <h2 id="pwa-install-title" className="mt-4 text-lg font-bold">Install {BRAND.productName}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {isIOS
              ? 'Add the official CCSF application to your Home Screen using the browser Share menu.'
              : 'Install the official CCSF application for faster access and controlled cache updates.'}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="rounded-xl bg-muted/55 px-2 py-3 text-center">
                <Icon className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
                <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>

          {isIOS ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-muted/45 p-4">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-xs leading-5 text-muted-foreground">Open Share, choose <strong>Add to Home Screen</strong>, confirm the My CCSF name and select Add.</p>
            </div>
          ) : (
            <div className="mt-5 flex gap-3">
              <Button variant="outline" onClick={dismiss} className="flex-1">Later</Button>
              <Button onClick={() => void install()} className="flex-1"><Download className="mr-2 h-4 w-4" aria-hidden="true" />Install</Button>
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
