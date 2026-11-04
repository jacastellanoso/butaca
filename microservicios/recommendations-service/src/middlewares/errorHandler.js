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

    // pf23: el body pasa el límite de express.json (10kb): 413 en lugar de 500.
  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande.' })
    return
  }
  res.status(500).json({ error: 'Ocurrió un error interno. Intentá de nuevo.' })
}
