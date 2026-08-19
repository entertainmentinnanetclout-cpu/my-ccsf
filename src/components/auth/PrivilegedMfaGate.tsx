import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, LockKeyhole, LogOut, QrCode, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

type PrivilegedRole = 'admin' | 'security';

interface TotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function PrivilegedMfaGate({ children, role }: { children: React.ReactNode; role: PrivilegedRole }) {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const label = role === 'admin' ? 'Admin' : 'CPS / Security';

  const inspect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: aalData, error: aalError }, { data: factorsData, error: factorsError }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (aalError) throw aalError;
      if (factorsError) throw factorsError;
      if (aalData.currentLevel === 'aal2') {
        setVerified(true);
        return;
      }
      setVerified(false);
      const verifiedTotp = factorsData.totp.find((factor) => factor.status === 'verified');
      setFactorId(verifiedTotp?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify MFA status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void inspect(); }, [inspect]);

  const startEnrollment = async () => {
    setWorking(true);
    setError(null);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `CCSF ${label}` });
      if (enrollError) throw enrollError;
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setFactorId(data.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start MFA enrollment.');
    } finally {
      setWorking(false);
    }
  };

  const verifyCode = async () => {
    const targetFactor = enrollment?.factorId ?? factorId;
    if (!targetFactor || !/^\d{6}$/.test(code.trim())) {
      setError('Enter the current 6-digit code from your authenticator app.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: targetFactor, code: code.trim() });
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

  if (loading) {
    return <main className="flex min-h-[70vh] items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label={`Checking ${label} MFA`} /></main>;
  }
  if (verified) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#002F6C]/10 via-background to-[#D7193F]/10 p-4">
      <Card className="w-full max-w-xl border-[#F2A900]/50 shadow-large">
        <CardHeader className="items-center text-center">
          <InstitutionBrand size="header" />
          <div className="mt-4 rounded-full bg-primary/10 p-3"><LockKeyhole className="h-7 w-7 text-primary" /></div>
          <CardTitle>{label} MFA required</CardTitle>
          <CardDescription>
            {label} portal access requires Authenticator Assurance Level 2. Password or biometric sign-in only completes the first factor; MFA can never be bypassed or replaced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!factorId && !enrollment && (
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-start gap-3"><QrCode className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-semibold">Set up mandatory authenticator MFA</p><p className="mt-1 text-sm text-muted-foreground">Use a TOTP-compatible authenticator application. This factor remains mandatory for every privileged session.</p></div></div>
              <Button className="mt-4 w-full" onClick={() => void startEnrollment()} disabled={working}>{working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Enroll {label} MFA</Button>
            </div>
          )}

          {enrollment && (
            <div className="space-y-4 rounded-xl border p-4">
              <div className="text-center"><p className="font-semibold">Scan this QR code</p><p className="text-sm text-muted-foreground">Then enter the six-digit code generated by your authenticator.</p></div>
              <img src={enrollment.qrCode} alt={`${label} TOTP enrollment QR code`} className="mx-auto h-52 w-52 rounded-xl border bg-white p-2" />
              <div className="rounded-lg bg-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manual secret</p><p className="mt-1 break-all font-mono text-sm">{enrollment.secret}</p></div>
            </div>
          )}

          {factorId && (
            <div className="space-y-2">
              <Label htmlFor="privileged-mfa-code">Authenticator code</Label>
              <Input id="privileged-mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(event) => { if (event.key === 'Enter' && code.length === 6) void verifyCode(); }} placeholder="000000" className="text-center font-mono text-xl tracking-[0.4em]" />
              <Button className="h-11 w-full font-bold" onClick={() => void verifyCode()} disabled={working || code.length !== 6}>{working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Verify and open {label} portal</Button>
            </div>
          )}

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <Button variant="ghost" className="w-full" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </CardContent>
      </Card>
    </main>
  );
}
