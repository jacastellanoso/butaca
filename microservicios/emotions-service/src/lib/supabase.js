import { createClient } from '@supabase/supabase-js'

import { env } from '../config/env.js'

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl && env.supabasePublishableKey,
)

// Cliente de servidor compartido, sin almacenar ni renovar sesiones propias.
export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null
