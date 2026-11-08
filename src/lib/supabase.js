import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null

let retornoOAuth = null

/**
 * Completa el flujo OAuth implícito antes de validar la sesión. Supabase suele
 * hacerlo automáticamente, pero procesarlo aquí evita una carrera con el router
 * por hash y elimina los tokens de la barra de direcciones inmediatamente.
 */
export function prepararSesionOAuth() {
  if (!supabase || retornoOAuth) return retornoOAuth ?? Promise.resolve()

  const parametros = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const accessToken = parametros.get('access_token')
  const refreshToken = parametros.get('refresh_token')
  if (!accessToken || !refreshToken) return Promise.resolve()

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  retornoOAuth = supabase.auth
    .setSession({ access_token: accessToken, refresh_token: refreshToken })
    .then(({ error }) => {
      if (error) throw error
    })
    .finally(() => {
      retornoOAuth = null
    })
  return retornoOAuth
}

export async function signInWithOAuth(provider) {
  if (!supabase) {
    throw new Error('Falta configurar la conexión con Supabase.')
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  })

  if (error) {
    throw error
  }

  return data
}

/** Cierra la sesión solo en este navegador; el estado local lo limpia quien llama. */
export async function cerrarSesion() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
}
