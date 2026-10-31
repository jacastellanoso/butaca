import { CONSENTIMIENTO_HISTORIAL_VERSION } from '../constants/emociones.js'
import { prisma } from '../lib/prisma.js'

// usuarioId no se devuelve: siempre es el del token que hizo la consulta.
const animoSelect = {
  id: true,
  emocion: true,
  confianza: true,
  origen: true,
  consentimientoHistorial: true,
  consentimientoVersion: true,
  consentimientoEn: true,
  creadoEn: true,
}

// Solo se consultan registros guardados con autorización explícita; los
// ánimos previos a pf13 (consentimientoHistorial = false) no forman parte del historial.
const delUsuario = (usuarioId) => ({ usuarioId, consentimientoHistorial: true })

export const animosService = {
  // No crea al Usuario: esa responsabilidad es de auth-service (POST /api/usuarios).
  // Si no existe, Prisma rechaza la clave foránea con P2003.
  async registrar(usuarioId, { emocion, confianza, origen }) {
    return prisma.animo.create({
      data: {
        usuarioId,
        emocion,
        confianza,
        origen,
        consentimientoHistorial: true,
        consentimientoVersion: CONSENTIMIENTO_HISTORIAL_VERSION,
        consentimientoEn: new Date(),
      },
      select: animoSelect,
    })
  },

  async listar(usuarioId, { pagina, limite, emocion, origen, desde, hasta, orden }) {
    const where = { ...delUsuario(usuarioId) }
    if (emocion) where.emocion = emocion
    if (origen) where.origen = origen
    if (desde || hasta) {
      where.creadoEn = {}
      if (desde) where.creadoEn.gte = desde
      if (hasta) where.creadoEn.lte = hasta
    }

    const [resultados, total] = await Promise.all([
      prisma.animo.findMany({
        where,
        // id desempata registros con la misma fecha para que las páginas no se solapen.
        orderBy: [{ creadoEn: orden }, { id: orden }],
        skip: (pagina - 1) * limite,
        take: limite,
        select: animoSelect,
      }),
      prisma.animo.count({ where }),
    ])

    return {
      resultados,
      paginacion: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
    }
  },

  async obtener(usuarioId, id) {
    return prisma.animo.findFirst({
      where: { id, ...delUsuario(usuarioId) },
      select: animoSelect,
    })
  },
}
