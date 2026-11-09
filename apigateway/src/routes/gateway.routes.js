import { createProxyMiddleware } from 'http-proxy-middleware'

import { env } from '../config/env.js'
import { services } from '../config/services.js'

/**
 * URL pública de /health del microservicio, para que el NAVEGADOR lo despierte.
 * En Render gratuito un servicio dormido no despierta con peticiones que salen
 * de otro servicio de Render (este gateway recibe un 502 inmediato con
 * x-render-routing), pero sí con una petición externa (medido en producción:
 * 9 intentos en 73 s por el gateway, todos 502; una petición directa, 200 a los 13 s).
 */
export function urlParaDespertar(service) {
  try {
    const url = new URL('/health', service.target)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export const ENCABEZADO_DESPERTAR = 'x-butaca-despertar'

/** Si la respuesta es el 502/503/504 de Render por un servicio dormido, agrega cómo despertarlo. */
export function marcarServicioDormido(proxyRes, service) {
  const despertar = urlParaDespertar(service)
  if (despertar && proxyRes.statusCode >= 502 && proxyRes.statusCode <= 504 && proxyRes.headers['x-render-routing']) {
    proxyRes.headers[ENCABEZADO_DESPERTAR] = despertar
  }
}

function sendUnavailableResponse(service, error, req, res) {
  console.error(
    `[gateway] ${service.name} no disponible para ${req.method} ${req.originalUrl}:`,
    error.message,
  )

  if (res.headersSent) {
    res.end()
    return
  }

  const despertar = urlParaDespertar(service)
  res.writeHead(502, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(despertar && { [ENCABEZADO_DESPERTAR]: despertar }),
  })
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
            // Servicio dormido en Render: se indica al navegador cómo despertarlo.
            marcarServicioDormido(proxyRes, service)
          },
        },
      }),
    )
  }
}