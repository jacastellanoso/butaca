import { esTipoValido } from '../constants/emociones.js'
import { favoritosService } from '../services/favoritos.service.js'

// GET /api/favoritos
export async function listarFavoritos(req, res) {
  const favoritos = await favoritosService.listar(req.user.id)
  res.json(favoritos)
}

// POST /api/favoritos   body: { tmdbId, tipo, titulo, poster? }
export async function agregarFavorito(req, res) {
  const { tmdbId, tipo, titulo, poster } = req.body ?? {}

  // Validación mínima; pf15_Zod la reemplaza por un esquema.
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return res.status(400).json({ error: 'tmdbId debe ser un entero positivo.' })
  }
  if (!esTipoValido(tipo)) {
    return res.status(400).json({ error: 'El tipo debe ser "movie" o "tv".' })
  }
  if (typeof titulo !== 'string' || titulo.trim() === '') {
    return res.status(400).json({ error: 'El título es obligatorio.' })
  }

  const { favorito, creado } = await favoritosService.agregar(req.user.id, {
    tmdbId,
    tipo,
    titulo: titulo.trim(),
    poster,
  })
  res.status(creado ? 201 : 200).json(favorito)
}

// DELETE /api/favoritos/:id
export async function eliminarFavorito(req, res) {
  const eliminado = await favoritosService.eliminar(req.user.id, req.params.id)

  if (!eliminado) {
    return res.status(404).json({ error: 'Ese favorito no existe.' })
  }
  res.status(204).end()
}