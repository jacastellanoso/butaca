import { authService } from '../services/auth.service.js'

// Exige "Authorization: Bearer <access_token de Supabase>".
// Si el token es válido, deja el usuario en req.user para los controladores.
export async function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token de sesión.' })
  }

  const user = await authService.obtenerUsuario(token)

  if (!user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' })
  }

  req.user = user
  next()
}