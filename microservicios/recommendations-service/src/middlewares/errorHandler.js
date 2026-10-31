import { env } from '../config/env.js'
import { DependencyError } from '../clients/servicios.client.js'

// No registrar excepciones de red: pueden incluir URLs o credenciales.
export function errorHandler(error, req, res, next) {
  if (res.writableEnded || res.destroyed) return
  if (error instanceof DependencyError) return res.status(error.status).json({ error: error.message })
  console.error(`[${env.serviceName}] Error interno no controlado.`)

  if (res.headersSent) {
    next(error)
    return
  }

  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' })
    return
  }

  res.status(500).json({ error: 'Ocurrió un error interno. Intentá de nuevo.' })
}
