import { esEmocionValida, esTipoValido } from '../constants/emociones.js'
import { recomendacionesService } from '../services/recomendaciones.service.js'

// GET /api/recomendaciones?emocion=happy&tipo=movie
export async function obtenerRecomendaciones(req, res) {
  const { emocion, tipo = 'movie' } = req.query

  if (!esEmocionValida(emocion)) {
    return res.status(400).json({ error: 'La emoción no es válida.' })
  }
  if (!esTipoValido(tipo)) {
    return res.status(400).json({ error: 'El tipo debe ser "movie" o "tv".' })
  }

  const recomendaciones = await recomendacionesService.obtener({ emocion, tipo })
  res.json(recomendaciones)
}