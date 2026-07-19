import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

/**
 * Converts a private chat-media object path into a temporary signed URL.
 * Existing absolute URLs are returned unchanged for backward compatibility.
 */
export const resolveChatMediaUrl = async (pathOrUrl: string | null): Promise<string | null> => {
  if (!pathOrUrl) return null;

  if (/^(https?:|blob:|data:)/i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const { data, error } = await supabase.storage
    .from('chat-media')
    .createSignedUrl(pathOrUrl, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error('Unable to create signed chat-media URL:', error);
    return null;
  }

  return data.signedUrl;
};
