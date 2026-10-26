import { createClient } from '@supabase/supabase-js'

import { env } from '../config/env.js'

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl && env.supabasePublishableKey,
)

// Cliente de servidor: no guarda sesión propia, solo verifica los tokens
// que manda el front en cada petición.
export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null