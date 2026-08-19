import { supabase } from '@/integrations/supabase/client';

export type BiometricCredentialSummary = {
  id: string;
  device_type: string | null;
  backed_up: boolean;
  transports: string[];
  rp_id: string;
  friendly_name: string | null;
  enabled: boolean;
  created_at: string;
  last_used_at: string | null;
};

export type BiometricStatus = {
  login_enabled: boolean;
  credentials: BiometricCredentialSummary[];
  credential_count: number;
  rp_id: string;
  privileged: boolean;
};

export type PreparedBiometricRegistration = {
  challenge_id: string;
  publicKey: PublicKeyCredentialCreationOptions;
  prepared_at: number;
};

export type PreparedBiometricSignIn = {
  email: string;
  challenge_id: string;
  publicKey: PublicKeyCredentialRequestOptions;
  prepared_at: number;
};

type BiometricResponse = {
  error?: string;
  code?: string;
  options?: Record<string, unknown>;
  challenge_id?: string;
  verified?: boolean;
  token_hash?: string;
  token_type?: string;
  success?: boolean;
} & Partial<BiometricStatus>;

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
      return { ...(row as unknown as PublicKeyCredentialDescriptor), id: base64urlToBytes(String(row.id)) };
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
      return { ...(row as unknown as PublicKeyCredentialDescriptor), id: base64urlToBytes(String(row.id)) };
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

function codedError(message: string, code?: string): CodedError {
  const failure = new Error(message) as CodedError;
  failure.code = code;
  return failure;
}

async function normalizeFunctionError(error: unknown): Promise<CodedError> {
  const fallback = error instanceof Error ? error.message : 'The biometric service could not complete the request.';
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).clone === 'function') {
    try {
      const body = await (context as Response).clone().json() as { error?: unknown; code?: unknown };
      if (typeof body?.error === 'string' && body.error.trim()) {
        return codedError(body.error.trim(), typeof body.code === 'string' ? body.code : undefined);
      }
    } catch {
      // Fall through to the connector error below.
    }
  }
  return codedError(fallback, (error as { code?: string } | null)?.code);
}

async function biometricCall(action: string, payload: Record<string, unknown> = {}): Promise<BiometricResponse> {
  const { data, error } = await supabase.functions.invoke<BiometricResponse>('biometric-auth', { body: { action, payload } });
  if (error) throw await normalizeFunctionError(error);
  const result = data ?? {};
  if (result.error) throw codedError(result.error, result.code);
  return result;
}

export function biometricSupported() {
  return typeof window !== 'undefined'
    && typeof window.PublicKeyCredential !== 'undefined'
    && typeof navigator.credentials?.create === 'function'
    && typeof navigator.credentials?.get === 'function';
}

export async function platformAuthenticatorAvailable() {
  if (!biometricSupported()) return false;
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') return true;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function biometricPlatformLabel() {
  if (typeof navigator === 'undefined') return 'device biometric';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Face ID / Touch ID';
  if (/Android/i.test(ua)) return 'fingerprint / face unlock';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Touch ID / device security';
  return 'device biometric / passkey';
}

export async function prepareBiometricSignIn(email: string): Promise<PreparedBiometricSignIn> {
  if (!biometricSupported()) throw new Error('This browser does not support biometric WebAuthn sign-in.');
  const normalizedEmail = email.trim().toLowerCase();
  const start = await biometricCall('authentication_options', { email: normalizedEmail });
  if (!start.options || !start.challenge_id) throw new Error('Biometric authentication challenge was not returned.');
  return {
    email: normalizedEmail,
    challenge_id: start.challenge_id,
    publicKey: authenticationOptionsFromJson(start.options),
    prepared_at: Date.now(),
  };
}

export async function completeBiometricSignIn(prepared: PreparedBiometricSignIn) {
  if (!biometricSupported()) throw new Error('This browser does not support biometric WebAuthn sign-in.');
  if (Date.now() - prepared.prepared_at > 4 * 60_000) {
    throw codedError('The biometric sign-in request expired. Prepare a new request and try again.', 'challenge_stale');
  }

  const credential = await navigator.credentials.get({ publicKey: prepared.publicKey }) as PublicKeyCredential | null;
  if (!credential) throw new Error('No biometric credential was returned.');
  const verified = await biometricCall('authentication_verify', {
    challenge_id: prepared.challenge_id,
    response: serializeAuthentication(credential),
  });
  if (!verified.verified || !verified.token_hash) throw new Error('Biometric verification succeeded but no CCSF sign-in token was returned.');
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: verified.token_hash, type: 'email' });
  if (error) throw error;
  if (!data.session || !data.user) throw new Error('CCSF could not create an authenticated session after biometric verification.');
  return data;
}

export async function signInWithBiometric(email: string) {
  const prepared = await prepareBiometricSignIn(email);
  return completeBiometricSignIn(prepared);
}

export async function getBiometricStatus(): Promise<BiometricStatus> {
  const result = await biometricCall('status');
  return {
    login_enabled: result.login_enabled === true,
    credentials: Array.isArray(result.credentials) ? result.credentials : [],
    credential_count: Number(result.credential_count) || 0,
    rp_id: String(result.rp_id ?? window.location.hostname),
    privileged: result.privileged === true,
  };
}

export async function prepareBiometricRegistration(): Promise<PreparedBiometricRegistration> {
  if (!biometricSupported()) throw new Error('This browser does not support biometric WebAuthn registration.');
  const start = await biometricCall('registration_options');
  if (!start.options || !start.challenge_id) throw new Error('Biometric registration challenge was not returned.');
  return {
    challenge_id: start.challenge_id,
    publicKey: registrationOptionsFromJson(start.options),
    prepared_at: Date.now(),
  };
}

export async function completeBiometricRegistration(prepared: PreparedBiometricRegistration) {
  if (!biometricSupported()) throw new Error('This browser does not support biometric WebAuthn registration.');
  if (Date.now() - prepared.prepared_at > 4 * 60_000) {
    throw codedError('The Face ID registration request expired. Prepare a new request and try again.', 'challenge_stale');
  }

  const credential = await navigator.credentials.create({ publicKey: prepared.publicKey }) as PublicKeyCredential | null;
  if (!credential) throw new Error('No biometric credential was created.');

  const verified = await biometricCall('registration_verify', {
    challenge_id: prepared.challenge_id,
    response: serializeRegistration(credential),
    friendly_name: `${biometricPlatformLabel()} · ${new Date().toLocaleDateString('en-ZA')}`,
  });
  if (!verified.verified) throw new Error('Biometric registration could not be verified.');
  return verified;
}

export async function registerBiometricDevice() {
  const prepared = await prepareBiometricRegistration();
  return completeBiometricRegistration(prepared);
}

export async function setBiometricLoginEnabled(enabled: boolean) {
  return biometricCall('set_enabled', { enabled });
}

export async function removeBiometricCredential(credentialId: string) {
  return biometricCall('remove_credential', { credential_id: credentialId });
}
