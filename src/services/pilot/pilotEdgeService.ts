import { supabase } from '@/integrations/supabase/client';

export async function invokePilotFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message || `The ${name} Pilot service failed.`;
    const context = (error as { context?: Response }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string };
        if (payload.error) message = payload.error;
      } catch {
        // Retain the Supabase client error message when the response is not JSON.
      }
    }
    throw new Error(message);
  }
  return data as T;
}
