import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  biometricPlatformLabel,
  type BiometricStatus,
  getBiometricStatus,
  platformAuthenticatorAvailable,
  registerBiometricDevice,
  removeBiometricCredential,
  setBiometricLoginEnabled,
} from '@/lib/biometricAuth';

export function BiometricSettingsCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const inspect = useCallback(async () => {
    setLoading(true);
    try {
      const [nextStatus, platform] = await Promise.all([getBiometricStatus(), platformAuthenticatorAvailable()]);
      setStatus(nextStatus);
      setAvailable(platform);
    } catch (caught) {
      toast({ title: 'Biometric settings unavailable', description: caught instanceof Error ? caught.message : 'Unable to load biometric settings.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void inspect(); }, [inspect]);

  const enroll = async () => {
    setWorking('enroll');
    try {
      await registerBiometricDevice();
      toast({ title: 'Biometric login enabled', description: `${biometricPlatformLabel()} is now registered for this CCSF account on this origin.` });
      await inspect();
    } catch (caught) {
      const failure = caught as Error & { name?: string };
      toast({ title: 'Biometric enrollment failed', description: failure.name === 'NotAllowedError' ? 'Enrollment was cancelled or timed out.' : failure.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const toggle = async (enabled: boolean) => {
    setWorking('toggle');
    try {
      await setBiometricLoginEnabled(enabled);
      toast({ title: enabled ? 'Biometric login on' : 'Biometric login off', description: enabled ? 'You can choose biometrics instead of your password on supported devices.' : 'Password sign-in remains available. Registered credentials are retained until you remove them.' });
      await inspect();
    } catch (caught) {
      toast({ title: 'Biometric preference not changed', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const remove = async (credentialId: string) => {
    setWorking(credentialId);
    try {
      await removeBiometricCredential(credentialId);
      toast({ title: 'Biometric device removed' });
      await inspect();
    } catch (caught) {
      toast({ title: 'Could not remove device', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  return (
    <Card className="border-[#F2A900]/40 shadow-large">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5 text-primary" />Face / fingerprint sign-in</CardTitle>
            <CardDescription className="mt-1">Optional passwordless first-factor sign-in on supported devices. Your face or fingerprint template never leaves the device.</CardDescription>
          </div>
          {status?.privileged && <Badge variant="outline"><ShieldCheck className="mr-1 h-3.5 w-3.5" />MFA still mandatory</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking device security…</div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="font-semibold">Use biometrics at sign-in</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">When enabled, the login page offers {biometricPlatformLabel()} as an alternative to entering your password.</p>
              </div>
              <Switch checked={status?.login_enabled === true} disabled={working !== null || !status?.credential_count} onCheckedChange={(checked) => void toggle(checked)} aria-label="Toggle biometric login" />
            </div>

            {available === false && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">This browser does not expose a user-verifying platform authenticator. Password sign-in remains available.</div>
            )}

            {available && (
              <Button variant={status?.credential_count ? 'outline' : 'default'} className="w-full" disabled={working !== null} onClick={() => void enroll()}>
                {working === 'enroll' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                {status?.credential_count ? 'Register another supported device' : `Enable ${biometricPlatformLabel()}`}
              </Button>
            )}

            {(status?.credentials ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Registered authenticators</p>
                {status?.credentials.map((credential) => (
                  <div key={credential.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{credential.friendly_name || 'CCSF biometric device'}</p>
                      <p className="text-xs text-muted-foreground">{credential.device_type || 'platform authenticator'} · Added {credential.created_at ? new Date(credential.created_at).toLocaleDateString('en-ZA') : 'recently'} · Last used {credential.last_used_at ? new Date(credential.last_used_at).toLocaleString('en-ZA') : 'not yet'}</p>
                    </div>
                    <Button size="sm" variant="ghost" disabled={working !== null} onClick={() => void remove(credential.id)}>{working === credential.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Remove</Button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl bg-muted/45 p-4 text-xs leading-5 text-muted-foreground">
              Biometrics replace only the password step. Admin, CPS/Security and Developer accounts must still complete TOTP MFA/AAL2 before privileged portals open.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
