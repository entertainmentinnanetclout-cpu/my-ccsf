import { useEffect, useState } from 'react';
import { CheckCircle2, WifiOff } from 'lucide-react';

export function ConnectivityBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;

    const handleOffline = () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      setShowRestored(false);
      setOnline(false);
    };

    const handleOnline = () => {
      setOnline(true);
      setShowRestored(true);
      restoreTimer = setTimeout(() => setShowRestored(false), 4000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (online && !showRestored) return null;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-[100] flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium shadow-md ${
        online ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
      }`}
      role="status"
      aria-live="polite"
    >
      {online ? (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Connection restored. Live data will update normally.
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          You are offline. Do not submit reports until the connection is restored.
        </>
      )}
    </div>
  );
}
