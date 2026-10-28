import express from 'express'

import { services } from './config/services.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { registerGatewayRoutes } from './routes/gateway.routes.js'

export const app = express()

app.disable('x-powered-by')

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

// No se usa express.json() antes de los proxies: el body se reenvía como stream
// para que cada microservicio sea responsable de validarlo y procesarlo.
registerGatewayRoutes(app)

app.use(notFound)
app.use(errorHandler)
