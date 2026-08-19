import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, LockKeyhole, LogOut, QrCode, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function StaffMfaGate({ children }: { children: React.ReactNode }) {
  const { userRole, signOut } = useAuth();
  const privileged = userRole === 'admin' || userRole === 'security';
  const [loading, setLoading] = useState(privileged);
  const [verified, setVerified] = useState(!privileged);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(async () => {
    if (!privileged) {
      setVerified(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [{ data: aal, error: aalError }, { data: factors, error: factorsError }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (aalError) throw aalError;
      if (factorsError) throw factorsError;
      setVerified(aal.currentLevel === 'aal2');
      setFactorId(factors.totp.find((item) => item.status === 'verified')?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify staff MFA status.');
    } finally {
      setLoading(false);
    }
  }, [privileged]);

  useEffect(() => { void inspect(); }, [inspect]);

  const enroll = async () => {
    setWorking(true);
    setError(null);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: userRole === 'admin' ? 'CCSF Admin Portal' : 'CCSF CPS / Security Portal',
      });
      if (enrollError) throw enrollError;
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setFactorId(data.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start staff MFA enrollment.');
    } finally {
      setWorking(false);
    }
  };

  const verify = async () => {
    const target = enrollment?.factorId ?? factorId;
    if (!target || !/^\d{6}$/.test(code)) {
      setError('Enter the current six-digit code from your authenticator app.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: target, code });
      if (verifyError) throw verifyError;
      await supabase.auth.refreshSession();
      setEnrollment(null);
      setCode('');
      await inspect();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The MFA code could not be verified.');
    } finally {
      setWorking(false);
    }
  };

  if (!privileged || verified) return <>{children}</>;
  if (loading) return <main className="flex min-h-[70vh] items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Checking staff MFA" /></main>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#002F6C]/10 via-background to-[#D7193F]/10 p-4">
      <Card className="w-full max-w-xl border-[#F2A900]/50 shadow-large">
        <CardHeader className="items-center text-center">
          <InstitutionBrand size="header" />
          <div className="mt-4 rounded-full bg-primary/10 p-3"><LockKeyhole className="h-7 w-7 text-primary" /></div>
          <CardTitle>Staff MFA required</CardTitle>
          <CardDescription>
            {userRole === 'admin' ? 'Admin' : 'CPS / Security'} access requires Authenticator Assurance Level 2. Password or biometric sign-in is only the first factor and never replaces MFA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!factorId && !enrollment && (
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-start gap-3"><QrCode className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-semibold">Set up an authenticator</p><p className="mt-1 text-sm text-muted-foreground">Scan the QR code using a TOTP-compatible authenticator app. Staff MFA is mandatory.</p></div></div>
              <Button className="mt-4 w-full" onClick={() => void enroll()} disabled={working}>{working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Enroll staff MFA</Button>
            </div>
          )}

          {enrollment && (
            <div className="space-y-4 rounded-xl border p-4">
              <p className="text-center text-sm font-semibold">Scan this QR code, then enter the six-digit code.</p>
              <img src={enrollment.qrCode} alt="CCSF staff TOTP enrollment QR code" className="mx-auto h-52 w-52 rounded-xl border bg-white p-2" />
              <div className="rounded-lg bg-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manual secret</p><p className="mt-1 break-all font-mono text-sm">{enrollment.secret}</p></div>
            </div>
          )}

          {factorId && (
            <div className="space-y-2">
              <Label htmlFor="staff-mfa-code">Authenticator code</Label>
              <Input id="staff-mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="text-center font-mono text-xl tracking-[0.4em]" />
              <Button className="h-11 w-full font-bold" onClick={() => void verify()} disabled={working || code.length !== 6}>{working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Verify MFA and continue</Button>
            </div>
          )}

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <Button variant="ghost" className="w-full" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </CardContent>
      </Card>
    </main>
  );
}
