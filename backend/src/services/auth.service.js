import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

// Se exporta como objeto para que las pruebas (pf14) puedan reemplazar
// `obtenerUsuario` con mock.method() sin llamar a Supabase.
export const authService = {
  async obtenerUsuario(token) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase no está configurado en el backend (.env).')
    }

    const { data, error } = await supabase.auth.getUser(token)

    // Token inválido o expirado: Supabase responde con un status 4xx.
    if (error?.status && error.status < 500) {
      return null
    }
    // Cualquier otro error (Supabase caído, sin red...) no es culpa del usuario.
    if (error) {
      throw error
    }

    return { id: data.user.id, email: data.user.email }
  },
}