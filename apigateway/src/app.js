import express from 'express'

import { services } from './config/services.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import {
  casco,
  exigirToken,
  limiteCuerpo,
  limiteEscritura,
  limiteGeneral,
  portero,
} from './middlewares/seguridad.js'
import { env } from './config/env.js'
import { registerGatewayRoutes } from './routes/gateway.routes.js'

export const app = express()

app.disable('x-powered-by')

// Detrás del proxy de Render, req.ip debe ser la IP del usuario y no la del
// proxy; si no, el rate limit trataría a todos como una sola persona.
app.set('trust proxy', env.trustProxy)

// Seguridad (pf23): casco y portero aplican también a /health.
app.use(casco)
app.use(portero)

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'butaca-api-gateway',
    routes: services.map(({ name, description, paths }) => ({
      name,
      description,
      paths,
    })),
  })
})

// Límite, tamaño y token solo en /api: /health queda libre para Docker y Render.
app.use('/api', limiteGeneral, limiteEscritura, limiteCuerpo, exigirToken)

// No se usa express.json() antes de los proxies: el body se reenvía como stream
// para que cada microservicio sea responsable de validarlo y procesarlo.
registerGatewayRoutes(app)

app.use(notFound)
app.use(errorHandler)