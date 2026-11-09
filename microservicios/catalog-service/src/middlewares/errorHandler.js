import { env } from '../config/env.js'

// El detalle queda en el log del contenedor; al cliente, un mensaje genérico.
export function errorHandler(error, req, res, next) {
  console.error(`[${env.serviceName}] Error no controlado:`, error)

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