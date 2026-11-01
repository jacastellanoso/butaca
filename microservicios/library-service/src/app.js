import express from 'express'

import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { favoritosRouter } from './routes/favoritos.routes.js'
import { historialRouter } from './routes/historial.routes.js'

// app.js crea y exporta Express sin listen (lo usan las pruebas).
export const app = express()

app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))

// Health check: lo usan Docker (HEALTHCHECK) y el gateway para saber si el servicio vive.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: env.serviceName })
})

app.use('/api/favoritos', favoritosRouter)
app.use('/api/historial', historialRouter)

app.use(notFound)
app.use(errorHandler)