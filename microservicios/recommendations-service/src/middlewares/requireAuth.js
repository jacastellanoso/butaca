import { DependencyError } from '../clients/servicios.client.js'

export function crearRequireAuth(config) {
  return async function requireAuth(req, res, next) {
    const authorization = req.get('authorization') ?? ''
    if (!/^Bearer +[^\s]+$/i.test(authorization)) return res.status(401).json({ error: 'Falta el token de sesión o su formato es incorrecto.' })
    try {
      const identity = await req.consultar(config.authServiceUrl, '/api/sesiones', authorization, true)
      if (!identity || typeof identity.id !== 'string' || !identity.id.trim() ||
          (identity.email != null && typeof identity.email !== 'string')) {
        throw new DependencyError(502, 'Respuesta inválida del servicio de autenticación.')
      }
      req.user = { id: identity.id, email: identity.email }
      next()
    } catch (error) {
      if (error.status === 404) return next(new DependencyError(502, 'Respuesta inválida del servicio de autenticación.'))
      next(error)
    }
  }
}
