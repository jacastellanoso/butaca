import { createProxyMiddleware } from 'http-proxy-middleware'

import { env } from '../config/env.js'
import { services } from '../config/services.js'

function sendUnavailableResponse(service, error, req, res) {
  console.error(
    `[gateway] ${service.name} no disponible para ${req.method} ${req.originalUrl}:`,
    error.message,
  )

  if (res.headersSent) {
    res.end()
    return
  }

  res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(
    JSON.stringify({
      error: 'El servicio solicitado no está disponible temporalmente.',
      service: service.name,
    }),
  )
}

export function registerGatewayRoutes(app) {
  for (const service of services) {
    app.use(
      createProxyMiddleware({
        pathFilter: service.paths,
        target: service.target,
        changeOrigin: true,
        xfwd: true,
        timeout: env.proxyTimeoutMs,
        proxyTimeout: env.proxyTimeoutMs,
        on: {
          error: (error, req, res) =>
            sendUnavailableResponse(service, error, req, res),
          proxyReq: (proxyReq) => {
            proxyReq.setHeader('x-butaca-gateway', 'pf8_APIGateway')
          },
          // El gateway es la única autoridad de CORS (pf23): se descartan los
          // encabezados CORS que un microservicio agregue por su cuenta, para
          // no duplicarlos (el navegador rechaza dos Access-Control-Allow-Origin).
          proxyRes: (proxyRes) => {
            for (const encabezado of Object.keys(proxyRes.headers)) {
              if (encabezado.startsWith('access-control-') || encabezado === 'x-powered-by') {
                delete proxyRes.headers[encabezado]
              }
            }
          },
        },
      }),
    )
  }
}