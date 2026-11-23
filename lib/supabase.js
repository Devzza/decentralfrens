import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// During `next build` the page is prerendered in a context where NEXT_PUBLIC_*
// env vars may be absent. Don't throw at module scope: return a stub that fails
// loudly only when actually called, so the build never breaks.
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn(
    'Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

function missingClient() {
  throw new Error(
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

const stub = {
  from: () => ({
    insert: async () => {
      missingClient();
    },
    select: () => ({
      then: () => missingClient(),
    }),
  }),
};

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : stub;
