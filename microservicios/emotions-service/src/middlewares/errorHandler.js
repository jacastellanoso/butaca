import { env } from '../config/env.js'

// El detalle queda en el log del contenedor; al cliente, un mensaje genérico.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error)
    return
  }

  // Errores del cliente: no se registran porque el error incluye el body
  // recibido, que puede contener datos emocionales.
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' })
    return
  }

  // Un resultado emocional ocupa pocos bytes: un body grande no es un registro válido.
  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande.' })
    return
  }

  console.error(`[${env.serviceName}] Error no controlado:`, error)
  res.status(500).json({ error: 'Ocurrió un error interno. Intentá de nuevo.' })
}
