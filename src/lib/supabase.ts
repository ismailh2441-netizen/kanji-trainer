import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

/** False when the app is built without Supabase environment variables. */
export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = createClient(
  url || 'https://not-configured.supabase.co',
  publishableKey || 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
)
