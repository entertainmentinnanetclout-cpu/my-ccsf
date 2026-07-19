import { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

export const PWA_UPDATE_EVENT = 'ccsf:pwa-update-ready';

export default function PWAUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ registration?: ServiceWorkerRegistration }>).detail;
      if (detail?.registration?.waiting) setRegistration(detail.registration);
    };

    window.addEventListener(PWA_UPDATE_EVENT, handleUpdate);
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistration('/').then((current) => {
        if (current?.waiting) setRegistration(current);
      });
    }
    return () => window.removeEventListener(PWA_UPDATE_EVENT, handleUpdate);
  }, []);

  useEffect(() => {
    if (!updating || !('serviceWorker' in navigator)) return;
    let reloading = false;
    const handleControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, [updating]);

  if (!registration) return null;

  const applyUpdate = () => {
    if (!registration.waiting) return;
    setUpdating(true);
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-[110] md:left-auto md:w-[26rem]" role="status" aria-live="polite" data-testid="pwa-update-prompt">
      <div className="relative rounded-2xl border border-[#F2A900]/50 bg-card p-5 shadow-2xl">
        <button
          type="button"
          onClick={() => setRegistration(null)}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Dismiss update notification"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <InstitutionBrand size="compact" />
        <div className="mt-4 flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" /></div>
          <div className="min-w-0">
            <h2 className="font-bold">A new CCSF version is ready</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Update now to replace the previous cached application shell and use the latest institutional release candidate.</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setRegistration(null)} disabled={updating}>Later</Button>
          <Button className="flex-1" onClick={applyUpdate} disabled={updating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${updating ? 'animate-spin' : ''}`} aria-hidden="true" />
            {updating ? 'Updating…' : 'Update now'}
          </Button>
        </div>
      </div>
    </aside>
  );
}
