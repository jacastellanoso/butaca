import express from 'express'
import { env } from './config/env.js'
import { crearCliente } from './clients/servicios.client.js'
import { crearRecomendacionesRouter } from './routes/recomendaciones.routes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'

export function crearApp({ config = env, fetchImpl = globalThis.fetch } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json())
  app.get('/health', (req, res) => res.json({ status: 'ok', service: config.serviceName }))
  app.use('/api/recomendaciones', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
      if (!res.headersSent && !res.destroyed) {
        res.status(503).json({ error: 'Se excedió el tiempo límite de recomendaciones.' })
      }
    }, config.requestTimeoutMs)
    const cleanup = () => { clearTimeout(timer); controller.abort() }
    res.once('finish', cleanup)
    res.once('close', cleanup)
    req.recommendationsSignal = controller.signal
    req.consultar = crearCliente({ config, fetchImpl, signal: controller.signal })
    next()
  }, crearRecomendacionesRouter(config))
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export const app = crearApp()
