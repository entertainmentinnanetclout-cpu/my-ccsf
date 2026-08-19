import { useCallback, useEffect, useMemo, useState } from 'react';
import { Fingerprint, KeyRound, Loader2, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

type CredentialSummary = {
  id: string;
  credential_id: string;
  device_type: string | null;
  backed_up: boolean;
  transports: string[];
  rp_id: string;
  friendly_name: string | null;
  created_at: string;
  last_used_at: string | null;
};

type BiometricStatus = {
  biometric_required: boolean;
  rp_id: string;
  credential_count: number;
  credentials: CredentialSummary[];
  assertion_active: boolean;
  assertion_expires_at: string | null;
  assertion_minutes: number;
};

type BiometricResponse = {
  error?: string;
  code?: string;
  options?: Record<string, unknown>;
  challenge_id?: string;
  verified?: boolean;
  assertion_expires_at?: string | null;
} & Partial<BiometricStatus>;

function base64urlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64url(value: ArrayBuffer | ArrayBufferView): string {
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function registrationOptionsFromJson(input: Record<string, unknown>): PublicKeyCredentialCreationOptions {
  const user = input.user as Record<string, unknown>;
  const excludeCredentials = Array.isArray(input.excludeCredentials) ? input.excludeCredentials : [];
  return {
    ...(input as unknown as PublicKeyCredentialCreationOptions),
    challenge: base64urlToBytes(String(input.challenge)),
    user: {
      ...(user as unknown as PublicKeyCredentialUserEntity),
      id: base64urlToBytes(String(user.id)),
    },
    excludeCredentials: excludeCredentials.map((entry) => {
      const row = entry as Record<string, unknown>;
      return {
        ...(row as unknown as PublicKeyCredentialDescriptor),
        id: base64urlToBytes(String(row.id)),
      };
    }),
  };
}

function authenticationOptionsFromJson(input: Record<string, unknown>): PublicKeyCredentialRequestOptions {
  const allowCredentials = Array.isArray(input.allowCredentials) ? input.allowCredentials : [];
  return {
    ...(input as unknown as PublicKeyCredentialRequestOptions),
    challenge: base64urlToBytes(String(input.challenge)),
    allowCredentials: allowCredentials.map((entry) => {
      const row = entry as Record<string, unknown>;
      return {
        ...(row as unknown as PublicKeyCredentialDescriptor),
        id: base64urlToBytes(String(row.id)),
      };
    }),
  };
}

function serializeRegistration(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bytesToBase64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bytesToBase64url(response.clientDataJSON),
      attestationObject: bytesToBase64url(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    },
  };
}

function serializeAuthentication(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bytesToBase64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bytesToBase64url(response.clientDataJSON),
      authenticatorData: bytesToBase64url(response.authenticatorData),
      signature: bytesToBase64url(response.signature),
      userHandle: response.userHandle ? bytesToBase64url(response.userHandle) : null,
    },
  };
}

async function biometricCall(action: string, payload: Record<string, unknown> = {}): Promise<BiometricResponse> {
  const { data, error } = await supabase.functions.invoke<BiometricResponse>('developer-biometric', {
    body: { action, payload },
  });
  if (error) throw error;
  const result = data ?? {};
  if (result.error) {
    const failure = new Error(result.error) as Error & { code?: string };
    failure.code = result.code;
    throw failure;
  }
  return result;
}

function platformLabel() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Face ID / Touch ID';
  if (/Android/i.test(ua)) return 'fingerprint / face unlock';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Touch ID / device passkey';
  return 'device biometric / passkey';
}

export function DeveloperBiometricGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshCode, setFreshCode] = useState('');
  const [needsFreshTotp, setNeedsFreshTotp] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(null);

  const webAuthnSupported = useMemo(() => typeof window !== 'undefined'
    && typeof window.PublicKeyCredential !== 'undefined'
    && typeof navigator.credentials?.create === 'function'
    && typeof navigator.credentials?.get === 'function', []);

  const inspect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await biometricCall('status');
      setStatus(result as BiometricStatus);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to inspect developer biometric security.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void inspect();
    if (webAuthnSupported && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      void PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(setPlatformAvailable)
        .catch(() => setPlatformAvailable(false));
    } else {
      setPlatformAvailable(false);
    }
  }, [inspect, webAuthnSupported]);

  const beginRegistration = async () => {
    setWorking(true);
    setError(null);
    try {
      const start = await biometricCall('registration_options');
      if (!start.options || !start.challenge_id) throw new Error('Registration challenge was not returned.');
      const publicKey = registrationOptionsFromJson(start.options);
      const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error('No biometric credential was created.');
      const verified = await biometricCall('registration_verify', {
        challenge_id: start.challenge_id,
        response: serializeRegistration(credential),
        friendly_name: `${platformLabel()} · ${new Date().toLocaleDateString('en-ZA')}`,
      });
      if (!verified.verified) throw new Error('Biometric registration was not verified.');
      setNeedsFreshTotp(false);
      setFreshCode('');
      await inspect();
    } catch (caught) {
      const failure = caught as Error & { code?: string; name?: string };
      if (failure.code === 'fresh_totp_required') setNeedsFreshTotp(true);
      if (failure.name === 'NotAllowedError') setError('Biometric registration was cancelled or timed out.');
      else setError(failure.message || 'Unable to register this device biometric.');
    } finally {
      setWorking(false);
    }
  };

  const refreshTotpAndRegister = async () => {
    if (!/^\d{6}$/.test(freshCode)) {
      setError('Enter the current 6-digit code from your authenticator app.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) throw factorError;
      const factor = factors.totp.find((item) => item.status === 'verified');
      if (!factor) throw new Error('No verified TOTP factor is available.');
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: freshCode });
      if (verifyError) throw verifyError;
      await supabase.auth.refreshSession();
      setNeedsFreshTotp(false);
      setWorking(false);
      await beginRegistration();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Fresh MFA verification failed.');
      setWorking(false);
    }
  };

  const verifyBiometric = async () => {
    setWorking(true);
    setError(null);
    try {
      const start = await biometricCall('authentication_options');
      if (!start.options || !start.challenge_id) throw new Error('Authentication challenge was not returned.');
      const publicKey = authenticationOptionsFromJson(start.options);
      const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error('No biometric credential was returned.');
      const verified = await biometricCall('authentication_verify', {
        challenge_id: start.challenge_id,
        response: serializeAuthentication(credential),
      });
      if (!verified.verified) throw new Error('Device biometric verification failed.');
      await inspect();
    } catch (caught) {
      const failure = caught as Error & { name?: string };
      setError(failure.name === 'NotAllowedError'
        ? 'Biometric verification was cancelled or timed out.'
        : failure.message || 'Device biometric verification failed.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Checking developer biometrics" /></main>;
  }

  if (error && !status) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-xl border-destructive/40">
          <CardHeader className="items-center text-center"><InstitutionBrand size="header" /><CardTitle>Biometric security unavailable</CardTitle><CardDescription>{error}</CardDescription></CardHeader>
          <CardContent><Button className="w-full" onClick={() => void inspect()}>Retry biometric security check</Button></CardContent>
        </Card>
      </main>
    );
  }

  if (!status?.biometric_required || status.assertion_active) return <>{children}</>;

  const needsEnrollment = status.credential_count === 0;
  const localBiometricUnavailable = !webAuthnSupported || platformAvailable === false;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#002F6C]/10 via-background to-[#D7193F]/10 p-4">
      <Card className="w-full max-w-xl border-[#F2A900]/50 shadow-large">
        <CardHeader className="items-center text-center">
          <InstitutionBrand size="header" />
          <div className="mt-4 rounded-full bg-primary/10 p-3">{needsEnrollment ? <Fingerprint className="h-8 w-8 text-primary" /> : <LockKeyhole className="h-8 w-8 text-primary" />}</div>
          <CardTitle>{needsEnrollment ? 'Register developer biometric security' : 'Developer biometric verification required'}</CardTitle>
          <CardDescription>
            AAL2 MFA has already been verified. The Developer Control Plane now requires a device-bound WebAuthn challenge using {platformLabel()} before system intelligence or controls are exposed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <div className="flex items-start gap-3"><Smartphone className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-semibold">Biometric data stays on your device</p><p className="mt-1 text-muted-foreground">CCSF stores a public WebAuthn credential and verification counter, not your face image or fingerprint template.</p></div></div>
          </div>

          {localBiometricUnavailable && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
              This browser does not report an available user-verifying platform authenticator. Use your Face ID/fingerprint-capable iPhone, Android device, Windows Hello/Touch ID device, or another supported WebAuthn authenticator.
            </div>
          )}

          {needsEnrollment && needsFreshTotp && (
            <div className="space-y-2 rounded-xl border p-4">
              <Label htmlFor="developer-biometric-fresh-totp">Fresh authenticator code</Label>
              <p className="text-sm text-muted-foreground">Adding a new biometric device requires a TOTP verification from the last five minutes.</p>
              <Input id="developer-biometric-fresh-totp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={freshCode} onChange={(event) => setFreshCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="text-center font-mono text-xl tracking-[0.35em]" />
              <Button className="w-full" disabled={working || freshCode.length !== 6 || localBiometricUnavailable} onClick={() => void refreshTotpAndRegister()}><KeyRound className="mr-2 h-4 w-4" />Verify MFA and register device</Button>
            </div>
          )}

          {needsEnrollment && !needsFreshTotp && (
            <Button className="h-12 w-full font-bold" disabled={working || localBiometricUnavailable} onClick={() => void beginRegistration()}>
              {working ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
              Set up {platformLabel()}
            </Button>
          )}

          {!needsEnrollment && (
            <Button className="h-12 w-full font-bold" disabled={working || !webAuthnSupported} onClick={() => void verifyBiometric()}>
              {working ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
              Verify {platformLabel()}
            </Button>
          )}

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <p className="text-center text-xs text-muted-foreground">Relying party: {status.rp_id}. Biometric assertions expire after {status.assertion_minutes} minutes and are tied to the authenticated developer session.</p>
        </CardContent>
      </Card>
    </main>
  );
}
