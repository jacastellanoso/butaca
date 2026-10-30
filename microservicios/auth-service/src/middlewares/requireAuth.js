import { supabase } from '../lib/supabase.js'

// Permite probar el middleware con un cliente simulado, sin conexiones externas.
export function createRequireAuth(supabaseClient) {
  return async function requireAuth(req, res, next) {
    const header = req.get('authorization') ?? ''
    const match = /^Bearer +([^\s]+)$/i.exec(header)

    if (!match || match[0] !== header) {
      return res.status(401).json({ error: 'Falta el token de sesión o su formato es incorrecto.' })
    }

    if (!supabaseClient) {
      return res.status(500).json({ error: 'El servicio de autenticación no está configurado.' })
    }

    let result
    try {
      result = await supabaseClient.auth.getUser(match[1])
    } catch {
      return res.status(503).json({ error: 'El servicio de autenticación no está disponible. Intentá de nuevo.' })
    }

    const { data, error } = result

    if (error) {
      // 429, errores de red y fallos de servidor no implican un token inválido.
      if ([400, 401, 403, 404, 422].includes(error.status)) {
        return res.status(401).json({ error: 'Sesión inválida o expirada.' })
      }

      return res.status(503).json({ error: 'El servicio de autenticación no está disponible. Intentá de nuevo.' })
    }

    if (!data?.user?.id) {
      return res.status(401).json({ error: 'Sesión inválida o expirada.' })
    }

    req.user = { id: data.user.id, email: data.user.email }
    next()
  }
}

// Instancia reutilizable para las futuras rutas protegidas; /health sigue público.
export const requireAuth = createRequireAuth(supabase)
