import { prisma } from '../lib/prisma.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Perfil activo de la petición (encabezado X-Butaca-Perfil).
 * Nunca se confía en el valor recibido: se verifica que el perfil pertenezca
 * a req.user.id. Sin encabezado se usa el perfil principal de la cuenta, así
 * los clientes anteriores (Postman, versiones previas del front) siguen
 * funcionando. Deja el id en req.perfilId (null si la cuenta aún no existe).
 */
export function createPerfilActivo(db = prisma) {
  return async function perfilActivo(req, res, next) {
    const solicitado = req.get('x-butaca-perfil')
    if (solicitado !== undefined && !UUID.test(solicitado)) {
      return res.status(400).json({ error: 'El perfil indicado no es válido.' })
    }
    try {
      const perfil = await db.perfil.findFirst({
        where: solicitado
          ? { id: solicitado, propietarioId: req.user.id }
          : { propietarioId: req.user.id, esPrincipal: true },
        select: { id: true },
      })
      if (solicitado && !perfil) {
        return res.status(403).json({ error: 'El perfil indicado no pertenece a tu cuenta.' })
      }
      req.perfilId = perfil?.id ?? null
      return next()
    } catch {
      return res.status(500).json({ error: 'No se pudo verificar el perfil activo. Intentá de nuevo.' })
    }
  }
}

export const perfilActivo = createPerfilActivo()
