import { prisma } from '../lib/prisma.js'

const favoritoSelect = {
  id: true,
  tmdbId: true,
  tipo: true,
  titulo: true,
  poster: true,
  creadoEn: true,
}

export const favoritosService = {
  async listar(usuarioId, perfilId, { pagina, limite, tipo, orden }) {
    const where = { usuarioId, perfilId }
    if (tipo) where.tipo = tipo

    const [resultados, total] = await Promise.all([
      prisma.favorito.findMany({
        where,
        orderBy: [{ creadoEn: orden }, { id: orden }],
        skip: (pagina - 1) * limite,
        take: limite,
        select: favoritoSelect,
      }),
      prisma.favorito.count({ where }),
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

  async agregar(usuarioId, perfilId, { tmdbId, tipo, titulo, poster }) {
    const existente = await prisma.favorito.findUnique({
      where: {
        usuarioId_perfilId_tmdbId_tipo: {
          usuarioId,
          perfilId,
          tmdbId,
          tipo,
        },
      },
      select: favoritoSelect,
    })

    if (existente) {
      return { favorito: existente, creado: false }
    }

    const favorito = await prisma.favorito.create({
      data: {
        usuarioId,
        perfilId,
        tmdbId,
        tipo,
        titulo,
        poster: poster ?? null,
      },
      select: favoritoSelect,
    })

    return { favorito, creado: true }
  },

  async eliminar(usuarioId, perfilId, id) {
    const resultado = await prisma.favorito.deleteMany({
      where: {
        id,
        usuarioId,
        perfilId,
      },
    })

    return resultado.count > 0
  },
}