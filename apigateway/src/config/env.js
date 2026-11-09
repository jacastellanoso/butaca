import 'dotenv/config'

function readPositiveInteger(value, fallback) {
  const parsedValue = Number(value)

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback
}

function readServiceUrl(value, fallback) {
  const serviceUrl = value || fallback
  const normalizedUrl = serviceUrl.includes('://')
    ? serviceUrl
    : `http://${serviceUrl}`

  try {
    return new URL(normalizedUrl).origin
  } catch {
    throw new Error(`URL de microservicio inválida: ${serviceUrl}`)
  }
}

// Lista separada por comas. Solo estos orígenes reciben permiso de CORS.
function readOrigins(value, fallback) {
  const origins = (value ?? fallback)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  for (const origin of origins) {
    let url
    try {
      url = new URL(origin)
    } catch {
      throw new Error(`Origen de CORS inválido: ${origin}`)
    }
    // Un origen es protocolo + host + puerto, sin ruta ni comodines.
    if (origin === '*' || url.origin !== origin) {
      throw new Error(`Origen de CORS inválido (sin rutas ni '*'): ${origin}`)
    }
  }
  return origins
}

// TRUST_PROXY: cuántos proxies hay delante del gateway (Render usa 1).
// Con 0, req.ip es la IP de la conexión directa.
function readTrustProxy(value) {
  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 0
}

export const env = {
  port: readPositiveInteger(process.env.GATEWAY_PORT, 3000),
  corsOrigins: readOrigins(process.env.CORS_ORIGINS, 'http://localhost:5173,http://127.0.0.1:5173'),
  trustProxy: readTrustProxy(process.env.TRUST_PROXY),
  rateLimitWindowMs: readPositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: readPositiveInteger(process.env.RATE_LIMIT_MAX, 300),
  rateLimitWriteMax: readPositiveInteger(process.env.RATE_LIMIT_WRITE_MAX, 60),
  maxBodyBytes: readPositiveInteger(process.env.MAX_BODY_BYTES, 32 * 1024),
  proxyTimeoutMs: readPositiveInteger(process.env.PROXY_TIMEOUT_MS, 60_000),
  authServiceUrl: readServiceUrl(
    process.env.AUTH_SERVICE_URL,
    'http://localhost:3021',
  ),
  emotionsServiceUrl: readServiceUrl(
    process.env.EMOTIONS_SERVICE_URL,
    'http://localhost:3022',
  ),
  catalogServiceUrl: readServiceUrl(
    process.env.CATALOG_SERVICE_URL,
    'http://localhost:3023',
  ),
  recommendationsServiceUrl: readServiceUrl(
    process.env.RECOMMENDATIONS_SERVICE_URL,
    'http://localhost:3024',
  ),
  libraryServiceUrl: readServiceUrl(
    process.env.LIBRARY_SERVICE_URL,
    'http://localhost:3025',
  ),
}
