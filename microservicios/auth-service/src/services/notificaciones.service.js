import { prisma } from '../lib/prisma.js'

const notificacionSelect = {
  id: true, perfilId: true, tipo: true, titulo: true, mensaje: true, datos: true, leida: true, creadoEn: true,
}

/** Nombre para mostrar de una cuenta: "Nombre Apellido" o la parte local del correo. */
export function nombreVisible(usuario) {
  const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim()
  if (nombre) return nombre
  return usuario?.email ? usuario.email.split('@')[0] : 'Alguien'
}

/** Nombre del perfil activo, con el de la cuenta como respaldo. */
export function nombrePerfil(perfil, usuario) {
  const nombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ').trim()
  return nombre || nombreVisible(usuario)
}

// Solo las notificaciones de la cuenta y, si tienen perfil, del perfil activo.
function visibles(usuarioId, perfilId) {
  return {
    usuarioId,
    OR: perfilId ? [{ perfilId: null }, { perfilId }] : [{ perfilId: null }],
  }
}

export const notificacionesService = {
  /** Crea varias notificaciones (una por destinatario). */
  async notificar(lista, db = prisma) {
    const datos = lista.filter((n) => n?.usuarioId)
    if (datos.length === 0) return
    await db.notificacion.createMany({
      data: datos.map(({ usuarioId, perfilId = null, tipo, titulo, mensaje, datos: extra = {}, clave = null }) => ({
        usuarioId, perfilId, tipo, titulo, mensaje, datos: extra, clave,
      })),
      skipDuplicates: true,
    })
  },

  async listar(usuarioId, perfilId, limite = 30) {
    const where = visibles(usuarioId, perfilId)
    const [resultados, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where, orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }], take: limite, select: notificacionSelect,
      }),
      prisma.notificacion.count({ where: { ...where, leida: false } }),
    ])
    return { resultados, noLeidas }
  },

  async marcarLeida(usuarioId, perfilId, id) {
    const { count } = await prisma.notificacion.updateMany({
      where: { ...visibles(usuarioId, perfilId), id }, data: { leida: true },
    })
    return count > 0
  },

  async marcarTodas(usuarioId, perfilId) {
    const { count } = await prisma.notificacion.updateMany({
      where: { ...visibles(usuarioId, perfilId), leida: false }, data: { leida: true },
    })
    return count
  },

  /** Recomendación del día: idempotente por perfil y fecha (clave única). */
  async delDia(usuarioId, perfilId, { tmdbId, tipo, titulo, poster, fecha }) {
    const clave = `del-dia:${perfilId}:${fecha}`
    const existente = await prisma.notificacion.findFirst({ where: { usuarioId, clave }, select: notificacionSelect })
    if (existente) return { notificacion: existente, creada: false }
    await this.notificar([{
      usuarioId,
      perfilId,
      tipo: 'recomendacion-del-dia',
      titulo: 'Tu recomendación del día',
      mensaje: `Hoy te sugerimos ver «${titulo}».`,
      datos: { tmdbId, tipo, titulo, poster, fecha },
      clave,
    }])
    const notificacion = await prisma.notificacion.findFirst({ where: { usuarioId, clave }, select: notificacionSelect })
    return { notificacion, creada: true }
  },
}
