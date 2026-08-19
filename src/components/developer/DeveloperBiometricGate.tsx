import { useCallback, useEffect, useMemo, useState } from 'react';
import { Fingerprint, Loader2, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type PreparedAuthentication = {
  challengeId: string;
  publicKey: PublicKeyCredentialRequestOptions;
  preparedAt: number;
};

type CodedError = Error & { code?: string };

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

function codedError(message: string, code?: string): CodedError {
  const failure = new Error(message) as CodedError;
  failure.code = code;
  return failure;
}

async function normalizeFunctionError(error: unknown): Promise<CodedError> {
  const fallback = error instanceof Error ? error.message : 'Developer biometric security could not complete the request.';
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).clone === 'function') {
    try {
      const body = await (context as Response).clone().json() as { error?: unknown; code?: unknown };
      if (typeof body?.error === 'string' && body.error.trim()) {
        return codedError(body.error.trim(), typeof body.code === 'string' ? body.code : undefined);
      }
    } catch {
      // Use the connector error below.
    }
  }
  return codedError(fallback, (error as { code?: string } | null)?.code);
}

async function biometricCall(action: string, payload: Record<string, unknown> = {}): Promise<BiometricResponse> {
  const { data, error } = await supabase.functions.invoke<BiometricResponse>('developer-biometric', {
    body: { action, payload },
  });
  if (error) throw await normalizeFunctionError(error);
  const result = data ?? {};
  if (result.error) throw codedError(result.error, result.code);
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
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparedAuthentication, setPreparedAuthentication] = useState<PreparedAuthentication | null>(null);
  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(null);

  const webAuthnSupported = useMemo(() => typeof window !== 'undefined'
    && typeof window.PublicKeyCredential !== 'undefined'
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

  const prepareAuthentication = useCallback(async () => {
    setPreparing(true);
    try {
      const start = await biometricCall('authentication_options');
      if (!start.options || !start.challenge_id) throw new Error('Developer biometric challenge was not returned.');
      setPreparedAuthentication({
        challengeId: start.challenge_id,
        publicKey: authenticationOptionsFromJson(start.options),
        preparedAt: Date.now(),
      });
      setError(null);
    } catch (caught) {
      setPreparedAuthentication(null);
      setError(caught instanceof Error ? caught.message : 'Unable to prepare developer biometric verification.');
    } finally {
      setPreparing(false);
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

  useEffect(() => {
    if (!status?.biometric_required || status.assertion_active || status.credential_count === 0) return;
    if (!webAuthnSupported || platformAvailable === false || preparedAuthentication || preparing) return;
    void prepareAuthentication();
  }, [status, webAuthnSupported, platformAvailable, preparedAuthentication, preparing, prepareAuthentication]);

  const verifyBiometric = async () => {
    if (!preparedAuthentication) {
      await prepareAuthentication();
      return;
    }

    if (Date.now() - preparedAuthentication.preparedAt > 4 * 60_000) {
      setPreparedAuthentication(null);
      setError('The prepared biometric request expired. A new request is being prepared; tap Verify again when it is ready.');
      void prepareAuthentication();
      return;
    }

    // No network call occurs before navigator.credentials.get(). This direct tap is
    // important on iOS/Safari, where WebAuthn needs a live user activation.
    setWorking(true);
    setError(null);
    try {
      const credential = await navigator.credentials.get({ publicKey: preparedAuthentication.publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error('No biometric credential was returned.');
      const verified = await biometricCall('authentication_verify', {
        challenge_id: preparedAuthentication.challengeId,
        response: serializeAuthentication(credential),
      });
      if (!verified.verified) throw new Error('Device biometric verification failed.');
      setPreparedAuthentication(null);
      await inspect();
    } catch (caught) {
      const failure = caught as Error & { name?: string; code?: string };
      if (failure.code === 'challenge_expired') setPreparedAuthentication(null);
      setError(failure.name === 'NotAllowedError'
        ? `${platformLabel()} did not complete. Tap Verify again and finish the device prompt.`
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

  const localBiometricUnavailable = !webAuthnSupported || platformAvailable === false;
  const label = platformLabel();

  if (status.credential_count === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#002F6C]/10 via-background to-[#D7193F]/10 p-4">
        <Card className="w-full max-w-xl border-[#F2A900]/50 shadow-large">
          <CardHeader className="items-center text-center">
            <InstitutionBrand size="header" />
            <div className="mt-4 rounded-full bg-primary/10 p-3"><Fingerprint className="h-8 w-8 text-primary" /></div>
            <CardTitle>Register a developer biometric device</CardTitle>
            <CardDescription>Your mandatory TOTP MFA is active. Register {label} from Login security before opening Developer controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="h-12 w-full font-bold"><Link to="/developer/security-settings">Open Login security</Link></Button>
            <p className="text-center text-xs text-muted-foreground">MFA remains mandatory. Biometric verification is an additional device-bound control and never replaces TOTP.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#002F6C]/10 via-background to-[#D7193F]/10 p-4">
      <Card className="w-full max-w-xl border-[#F2A900]/50 shadow-large">
        <CardHeader className="items-center text-center">
          <InstitutionBrand size="header" />
          <div className="mt-4 rounded-full bg-primary/10 p-3"><LockKeyhole className="h-8 w-8 text-primary" /></div>
          <CardTitle>Developer biometric verification required</CardTitle>
          <CardDescription>AAL2/TOTP MFA has already been verified. Complete the separate device-bound {label} check before Developer controls are exposed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <div className="flex items-start gap-3"><Smartphone className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-semibold">Biometric data stays on your device</p><p className="mt-1 text-muted-foreground">CCSF stores a public WebAuthn credential and verification counter, not your face image or fingerprint template.</p></div></div>
          </div>

          {localBiometricUnavailable && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
              This browser does not report an available user-verifying platform authenticator. Open CCSF in a supported Face ID/fingerprint/Windows Hello/Touch ID browser.
            </div>
          )}

          <Button className="h-12 w-full font-bold" disabled={working || preparing || localBiometricUnavailable || !preparedAuthentication} onClick={() => void verifyBiometric()}>
            {working || preparing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            {preparing ? 'Preparing secure challenge…' : `Verify ${label}`}
          </Button>

          {!preparedAuthentication && !preparing && !localBiometricUnavailable && (
            <Button variant="outline" className="w-full" onClick={() => void prepareAuthentication()}>Prepare biometric challenge</Button>
          )}

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <p className="text-center text-xs text-muted-foreground">Relying party: {status.rp_id}. Developer biometric assertions expire after {status.assertion_minutes} minutes and are tied to this authenticated session.</p>
        </CardContent>
      </Card>
    </main>
  );
}
