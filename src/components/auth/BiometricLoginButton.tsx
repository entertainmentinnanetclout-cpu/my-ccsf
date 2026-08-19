import { useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { biometricPlatformLabel, platformAuthenticatorAvailable, signInWithBiometric } from '@/lib/biometricAuth';

export function BiometricLoginButton({ email, onSuccess, onError }: { email: string; onSuccess?: () => void; onError?: (message: string) => void }) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    void platformAuthenticatorAvailable().then((value) => {
      if (active) {
        setAvailable(value);
        setChecking(false);
      }
    });
    return () => { active = false; };
  }, []);

  if (checking || !available) return null;

  const run = async () => {
    if (!email.trim()) {
      onError?.('Enter your CCSF account email before using biometric sign-in.');
      return;
    }
    setWorking(true);
    try {
      await signInWithBiometric(email);
      onSuccess?.();
    } catch (caught) {
      const failure = caught as Error & { name?: string };
      const message = failure.name === 'NotAllowedError'
        ? 'Biometric sign-in was cancelled or timed out. You can try again or use your password.'
        : failure.message || 'Biometric sign-in failed. Use your password or try again.';
      onError?.(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Button type="button" variant="outline" className="h-12 w-full font-bold" disabled={working} onClick={() => void run()}>
      {working ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
      Sign in with {biometricPlatformLabel()}
    </Button>
  );
}
