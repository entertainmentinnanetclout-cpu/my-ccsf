import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lfelzsubrlqwcsnetpov.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZWx6c3Vicmxxd2NzbmV0cG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTMyOTEsImV4cCI6MjA3OTIyOTI5MX0.F1H2d_5360OUlejffI-CcOxnHw02MV_vvRmCMc_oVuc";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
