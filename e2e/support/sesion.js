// Sesión de Supabase simulada para las pruebas E2E.
//
// No se puede automatizar el login real con Google/GitHub (bloquean
// navegadores automatizados y exigen una cuenta real). En su lugar se guarda en
// localStorage una sesión con el formato de supabase-js y se responde a
// /auth/v1/user desde el backend falso, igual que lo haría Supabase Auth.

export const SUPABASE_URL = 'https://e2e-butaca.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_e2e_solo_pruebas'

// supabase-js guarda la sesión en sb-<primera parte del dominio>-auth-token.
const CLAVE_ALMACENAMIENTO = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`

export const USUARIO_PRUEBA = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'majo@butaca.test',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { full_name: 'Majo Prueba', name: 'Majo Prueba' },
  created_at: '2026-10-24T00:00:00.000Z',
}

export const TOKEN_PRUEBA = 'token-e2e-de-prueba'

/** storageState de Playwright con la sesión ya guardada en el navegador. */
export function estadoConSesion(baseURL) {
  const expira = Math.floor(Date.now() / 1000) + 60 * 60
  const sesion = {
    access_token: TOKEN_PRUEBA,
    refresh_token: 'refresh-e2e',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expira,
    user: USUARIO_PRUEBA,
  }

  return {
    cookies: [],
    origins: [
      {
        origin: new URL(baseURL).origin,
        localStorage: [{ name: CLAVE_ALMACENAMIENTO, value: JSON.stringify(sesion) }],
      },
    ],
  }
}