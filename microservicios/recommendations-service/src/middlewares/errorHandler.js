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

  res.status(500).json({ error: 'Ocurrió un error interno. Intentá de nuevo.' })
}