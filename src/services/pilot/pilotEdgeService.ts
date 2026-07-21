import { supabase } from '@/integrations/supabase/client';

interface PilotFunctionErrorPayload {
  error?: string;
  code?: string;
}

const readFunctionError = async (error: unknown, name: string): Promise<{ message: string; code: string }> => {
  const functionError = error as { message?: string; context?: Response };
  let message = functionError?.message || `The ${name} Pilot service failed.`;
  let code = '';

  if (functionError?.context instanceof Response) {
    try {
      const payload = await functionError.context.clone().json() as PilotFunctionErrorPayload;
      if (payload.error) message = payload.error;
      if (payload.code) code = payload.code;
    } catch {
      // Retain the Supabase client error when the response is not JSON.
    }
  }

  return { message, code };
};

const isRefreshableAuthFailure = (message: string, code: string) =>
  /jwt|token|auth|session.*(expired|timed out)|not authenticated|unauthorized/i.test(`${code} ${message}`);

const ensureFreshAuthSession = async (forceRefresh = false): Promise<void> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const expiresAtMs = (sessionData.session?.expires_at ?? 0) * 1000;
  const expiresSoon = !expiresAtMs || expiresAtMs <= Date.now() + 60_000;
  if (!forceRefresh && sessionData.session && !expiresSoon) return;

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session) {
    throw new Error('Your secure sign-in needs to be renewed. Please sign in again and retry the Pilot test.');
  }
};

export async function invokePublicPilotFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as T;

  const parsed = await readFunctionError(error, name);
  throw new Error(parsed.message);
}

export async function invokePilotFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  await ensureFreshAuthSession();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (!error) return data as T;

    const parsed = await readFunctionError(error, name);
    if (attempt === 0 && isRefreshableAuthFailure(parsed.message, parsed.code)) {
      await ensureFreshAuthSession(true);
      continue;
    }

    throw new Error(parsed.message);
  }

  throw new Error(`The ${name} Pilot service failed.`);
}
