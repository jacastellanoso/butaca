import express from 'express'

import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'

// app.js crea y exporta Express sin listen (lo usan las pruebas).
export const app = express()

app.disable('x-powered-by')
app.use(express.json())

// Health check: lo usan Docker (HEALTHCHECK) y el gateway para saber si el servicio vive.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: env.serviceName })
})

// ── Rutas del microservicio ──────────────────────────────────────────────
// El responsable de la rama agrega aquí sus routers con la MISMA ruta pública
// que envía el gateway (por ejemplo app.use('/api/favoritos', favoritosRouter)).
// ─────────────────────────────────────────────────────────────────────────

app.use(notFound)
app.use(errorHandler)