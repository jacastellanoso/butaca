import { prisma } from '../lib/prisma.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Perfil activo de la petición (encabezado X-Butaca-Perfil).
 * El servidor nunca confía en el valor recibido: verifica que el perfil
 * pertenezca a req.user.id. Sin encabezado se usa el perfil principal.
 * Deja en req.perfil { id, nombre, apellido } o null si la cuenta aún no
 * tiene perfiles (usuario sin sincronizar).
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
        select: { id: true, nombre: true, apellido: true },
      })
      if (solicitado && !perfil) {
        return res.status(403).json({ error: 'El perfil indicado no pertenece a tu cuenta.' })
      }
      req.perfil = perfil ?? null
      return next()
    } catch {
      return res.status(500).json({ error: 'No se pudo verificar el perfil activo. Intentá de nuevo.' })
    }
  }
}

export const perfilActivo = createPerfilActivo()
