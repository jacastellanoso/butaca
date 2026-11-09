/* import { randomUUID } from 'node:crypto'

// Almacenamiento TEMPORAL en memoria. pf7_Prisma lo reemplaza por la base.
const favoritosPorUsuario = new Map()

export const favoritosService = {
  async listar(usuarioId) {
    return favoritosPorUsuario.get(usuarioId) ?? []
  },

  async agregar(usuarioId, { tmdbId, tipo, titulo, poster }) {
    const lista = favoritosPorUsuario.get(usuarioId) ?? []
    const existente = lista.find((f) => f.tmdbId === tmdbId && f.tipo === tipo)

    if (existente) {
      return { favorito: existente, creado: false }
    }

    const favorito = {
      id: randomUUID(),
      tmdbId,
      tipo,
      titulo,
      poster: poster ?? null,
      creadoEn: new Date().toISOString(),
    }
    lista.push(favorito)
    favoritosPorUsuario.set(usuarioId, lista)
    return { favorito, creado: true }
  },

  async eliminar(usuarioId, id) {
    const lista = favoritosPorUsuario.get(usuarioId) ?? []
    const restantes = lista.filter((f) => f.id !== id)
    favoritosPorUsuario.set(usuarioId, restantes)
    return restantes.length < lista.length
  },
}*/

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
  async listar(usuarioId) {
    return prisma.favorito.findMany({
      where: { usuarioId },
      orderBy: { creadoEn: 'desc' },
      select: favoritoSelect,
    })
  },

  async agregar(usuarioId, { tmdbId, tipo, titulo, poster }) {
    const existente = await prisma.favorito.findUnique({
      where: {
        usuarioId_tmdbId_tipo: {
          usuarioId,
          tmdbId,
          tipo,
        },
      },
      select: favoritoSelect,
    })

    if (existente) {
      return { favorito: existente, creado: false }
    }

    await prisma.usuario.upsert({
      where: { id: usuarioId },
      update: {},
      create: { id: usuarioId },
    })

    const favorito = await prisma.favorito.create({
      data: {
        usuarioId,
        tmdbId,
        tipo,
        titulo,
        poster: poster ?? null,
      },
      select: favoritoSelect,
    })

    return { favorito, creado: true }
  },

  async eliminar(usuarioId, id) {
    const resultado = await prisma.favorito.deleteMany({
      where: {
        id,
        usuarioId,
      },
    })

    return resultado.count > 0
  },
}