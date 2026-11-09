import { esEmocionValida } from '../constants/emociones.js'
import { animosService } from '../services/animos.service.js'

// POST /api/animos   body: { emocion, confianza }
export async function registrarAnimo(req, res) {
  const { emocion, confianza } = req.body ?? {}

  // Validación mínima; pf15_Zod la reemplaza por un esquema.
  if (!esEmocionValida(emocion)) {
    return res.status(400).json({ error: 'La emoción no es válida.' })
  }
  if (typeof confianza !== 'number' || confianza < 0 || confianza > 1) {
    return res.status(400).json({ error: 'La confianza debe ser un número entre 0 y 1.' })
  }

  const animo = await animosService.registrar(req.user.id, { emocion, confianza })
  res.status(201).json(animo)
}

// GET /api/animos   → historial del usuario (alimenta el tablero)
export async function listarAnimos(req, res) {
  const animos = await animosService.listar(req.user.id)
  res.json(animos)
}