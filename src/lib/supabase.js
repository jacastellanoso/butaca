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
        flowType: 'pkce',
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

  const url = new URL(window.location.href)
  const parametrosHash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const esRetornoOAuth = url.searchParams.has('code') || parametrosHash.has('access_token')
  const errorOAuth = url.searchParams.get('error_description') ?? parametrosHash.get('error_description')

  if (!esRetornoOAuth && !errorOAuth) return Promise.resolve()

  const limpiarRetorno = () => {
    const actual = new URL(window.location.href)
    for (const parametro of ['code', 'error', 'error_code', 'error_description']) {
      actual.searchParams.delete(parametro)
    }
    actual.hash = ''
    window.history.replaceState(null, '', `${actual.pathname}${actual.search}`)
  }

  if (errorOAuth) {
    limpiarRetorno()
    return Promise.reject(new Error('El proveedor rechazó el inicio de sesión.'))
  }

  // getSession espera la inicialización interna de Supabase. Esa inicialización
  // conserva y usa el code_verifier de PKCE; no debemos intercambiar el código
  // una segunda vez porque cada código OAuth solo puede utilizarse una vez.
  retornoOAuth = supabase.auth.getSession()
    .then(({ data, error }) => {
      if (error || !data?.session) throw error ?? new Error('Supabase no creó una sesión.')
      limpiarRetorno()
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
      skipBrowserRedirect: false,
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
