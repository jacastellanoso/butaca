import { prisma } from '../lib/prisma.js'

const historialSelect = {
  id: true,
  emocion: true,
  tmdbId: true,
  tipo: true,
  titulo: true,
  poster: true,
  calificacion: true,
  creadoEn: true,
}

export const historialService = {
  async registrar(usuarioId, datos) {
    return prisma.historialRecomendacion.create({
      data: {
        usuarioId,
        ...datos,
      },
      select: historialSelect,
    })
  },

  async listar(usuarioId, { pagina, limite, emocion, tipo, desde, hasta, orden }) {
    const where = { usuarioId }
    if (emocion) where.emocion = emocion
    if (tipo) where.tipo = tipo
    if (desde || hasta) {
      where.creadoEn = {}
      if (desde) where.creadoEn.gte = desde
      if (hasta) where.creadoEn.lte = hasta
    }

    const [resultados, total] = await Promise.all([
      prisma.historialRecomendacion.findMany({
        where,
        orderBy: [{ creadoEn: orden }, { id: orden }],
        skip: (pagina - 1) * limite,
        take: limite,
        select: historialSelect,
      }),
      prisma.historialRecomendacion.count({ where }),
    ])

    return {
      resultados,
      paginacion: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite),
      },
    }
  },

  async eliminar(usuarioId, id) {
    const resultado = await prisma.historialRecomendacion.deleteMany({
      where: {
        id,
        usuarioId,
      },
    })

    return resultado.count > 0
  },
}