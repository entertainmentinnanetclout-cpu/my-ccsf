import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2, Plus, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  biometricPlatformLabel,
  biometricSupported,
  completeBiometricRegistration,
  getBiometricStatus,
  platformAuthenticatorAvailable,
  prepareBiometricRegistration,
  removeBiometricCredential,
  setBiometricLoginEnabled,
  type BiometricStatus,
  type PreparedBiometricRegistration,
} from '@/lib/biometricAuth';

export function BiometricLoginSettings() {
  const { toast } = useToast();
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(null);
  const [preparedRegistration, setPreparedRegistration] = useState<PreparedBiometricRegistration | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getBiometricStatus());
    } catch (error) {
      toast({ title: 'Biometric settings unavailable', description: error instanceof Error ? error.message : 'Unable to load biometric settings.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    if (!biometricSupported()) {
      setPlatformAvailable(false);
      return;
    }
    void platformAuthenticatorAvailable().then(setPlatformAvailable);
  }, [load]);

  const prepareRegistration = async () => {
    setWorking('prepare');
    try {
      const prepared = await prepareBiometricRegistration();
      setPreparedRegistration(prepared);
      toast({
        title: `${biometricPlatformLabel()} is ready`,
        description: `Tap “Continue with ${biometricPlatformLabel()}” to open the secure device prompt.`,
      });
    } catch (error) {
      const failure = error as Error & { code?: string };
      toast({
        title: 'Could not prepare biometric registration',
        description: failure.message || 'Unable to prepare biometric registration.',
        variant: 'destructive',
      });
    } finally {
      setWorking(null);
    }
  };

  const completeRegistration = async () => {
    if (!preparedRegistration) return;

    // IMPORTANT: no awaited network call happens before this function invokes
    // navigator.credentials.create(). This keeps iOS/Safari's user gesture alive.
    setWorking('register');
    try {
      await completeBiometricRegistration(preparedRegistration);
      setPreparedRegistration(null);
      toast({
        title: 'Biometric login enabled',
        description: `${biometricPlatformLabel()} is now registered for passwordless CCSF sign-in on this site.`,
      });
      await load();
    } catch (error) {
      const failure = error as Error & { name?: string; code?: string };
      if (failure.code === 'challenge_stale' || failure.code === 'challenge_expired') setPreparedRegistration(null);
      toast({
        title: 'Biometric registration failed',
        description: failure.name === 'NotAllowedError'
          ? `${biometricPlatformLabel()} did not complete. Tap Continue again and finish the device prompt; if no prompt appears, keep this page open in Safari rather than an in-app browser.`
          : failure.message || 'Unable to register this biometric device.',
        variant: 'destructive',
      });
    } finally {
      setWorking(null);
    }
  };

  const toggle = async (enabled: boolean) => {
    if (enabled && (status?.credential_count ?? 0) === 0) {
      if (!preparedRegistration) await prepareRegistration();
      return;
    }
    setWorking('toggle');
    try {
      await setBiometricLoginEnabled(enabled);
      toast({ title: enabled ? 'Biometric login enabled' : 'Biometric login disabled', description: enabled ? 'You can now choose biometrics instead of your password at sign-in.' : 'Password sign-in remains available. Registered device credentials are retained until you remove them.' });
      await load();
    } catch (error) {
      toast({ title: 'Setting not changed', description: error instanceof Error ? error.message : 'Unable to update biometric login.', variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const remove = async (credentialId: string) => {
    setWorking(credentialId);
    try {
      await removeBiometricCredential(credentialId);
      toast({ title: 'Biometric device removed', description: 'That WebAuthn credential can no longer sign in to your CCSF account.' });
      await load();
    } catch (error) {
      toast({ title: 'Device not removed', description: error instanceof Error ? error.message : 'Unable to remove this credential.', variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  if (loading) {
    return <Card><CardContent className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Loading biometric login settings" /></CardContent></Card>;
  }

  const unavailable = !biometricSupported() || platformAvailable === false;
  const label = biometricPlatformLabel();

  return (
    <div className="space-y-5">
      <Card className="border-[#F2A900]/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5 text-primary" />Biometric sign-in</CardTitle>
              <CardDescription className="mt-1">Use {label} as an alternative to your password when signing in to an active CCSF profile.</CardDescription>
            </div>
            <Switch aria-label="Enable biometric login" checked={status?.login_enabled === true} disabled={working !== null || unavailable} onCheckedChange={(enabled) => void toggle(enabled)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SecurityFact title="Password" detail="Always remains available" />
            <SecurityFact title="Biometric data" detail="Never stored by CCSF" />
            <SecurityFact title="Privileged MFA" detail={status?.privileged ? 'Still mandatory' : 'Role policy applies'} />
          </div>

          {unavailable && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
              This browser does not report a user-verifying platform authenticator. Open CCSF on a Face ID/Touch ID iPhone or iPad, fingerprint/face-capable Android device, Windows Hello device, or supported Mac to register biometrics.
            </div>
          )}

          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">What CCSF stores</p><p className="mt-1 text-muted-foreground">Your device performs the face/fingerprint check locally. CCSF stores only a WebAuthn public credential, verification counter and device label. Your face image and fingerprint template never leave the device.</p></div></div>
          </div>

          {preparedRegistration ? (
            <div className="space-y-3 rounded-xl border border-[#F2A900]/45 bg-[#F2A900]/5 p-4">
              <div>
                <p className="font-semibold">Registration request prepared</p>
                <p className="mt-1 text-sm text-muted-foreground">The secure server challenge is ready. The next tap goes directly to {label} with no network request in between.</p>
              </div>
              <Button className="h-12 w-full sm:w-auto" disabled={working !== null || unavailable} onClick={() => void completeRegistration()}>
                {working === 'register' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
                Continue with {label}
              </Button>
              <Button variant="ghost" size="sm" disabled={working !== null} onClick={() => setPreparedRegistration(null)}>Cancel prepared request</Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full sm:w-auto" disabled={working !== null || unavailable} onClick={() => void prepareRegistration()}>
              {working === 'prepare' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Prepare {label}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Registered biometric devices</CardTitle><CardDescription>Credentials are scoped to this CCSF web origin: {status?.rp_id ?? window.location.hostname}.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {status?.credentials.map((credential) => (
            <div key={credential.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2"><Smartphone className="h-5 w-5 text-primary" /></div><div><p className="font-semibold">{credential.friendly_name || credential.device_type || 'CCSF biometric device'}</p><p className="mt-1 text-xs text-muted-foreground">Registered {new Date(credential.created_at).toLocaleString('en-ZA')}{credential.last_used_at ? ` · last used ${new Date(credential.last_used_at).toLocaleString('en-ZA')}` : ''}</p><p className="mt-1 text-xs text-muted-foreground">{credential.backed_up ? 'Synced/backed-up credential' : 'Device-bound credential'} · {credential.transports.join(', ') || 'platform transport'}</p></div></div>
              <Button variant="outline" size="sm" disabled={working !== null} onClick={() => void remove(credential.id)}>{working === credential.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Remove</Button>
            </div>
          ))}
          {!status?.credentials.length && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No biometric device is registered for this CCSF origin yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityFact({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p><p className="mt-1 text-sm font-bold">{detail}</p></div>;
}
