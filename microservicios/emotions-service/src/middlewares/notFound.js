import { env } from '../config/env.js'

// Incluye el nombre del servicio para saber qué contenedor respondió.
export function notFound(req, res) {
  res.status(404).json({
    error: `No existe la ruta ${req.method} ${req.path}`,
    service: env.serviceName,
  })
}