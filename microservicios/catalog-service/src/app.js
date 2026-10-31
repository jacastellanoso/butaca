import express from 'express'

import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { catalogoRouter } from './routes/catalogo.routes.js'

const ORIGENES_PERMITIDOS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://butaca.vercel.app',
]

// app.js crea y exporta Express sin listen (lo usan las pruebas).
export const app = express()

app.disable('x-powered-by')

// Lista blanca de CORS para permitir el consumo desde el frontend a través del API Gateway.
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ORIGENES_PERMITIDOS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  return next()
})

app.use(express.json())

// Health check: lo usan Docker (HEALTHCHECK) y el gateway para saber si el servicio vive.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: env.serviceName })
})

// ── Rutas del microservicio ──────────────────────────────────────────────
app.use('/api/catalogo', catalogoRouter)
// ─────────────────────────────────────────────────────────────────────────

app.use(notFound)
app.use(errorHandler)