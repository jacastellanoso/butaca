import { randomUUID } from 'node:crypto'

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
}