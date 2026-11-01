import 'dotenv/config'

// Único lugar donde se lee process.env en este microservicio.
export const env = {
  serviceName: process.env.SERVICE_NAME ?? 'recommendations-service',
  port: Number(process.env.PORT) || 3024,
  authServiceUrl: readUrl('AUTH_SERVICE_URL', 'http://auth-service:3021'),
  emotionsServiceUrl: readUrl('EMOTIONS_SERVICE_URL', 'http://emotions-service:3022'),
  catalogServiceUrl: readUrl('CATALOG_SERVICE_URL', 'http://catalog-service:3023'),
  requestTimeoutMs: readTimeout('REQUEST_TIMEOUT_MS', 4000),
  upstreamTimeoutMs: readTimeout('UPSTREAM_TIMEOUT_MS', 2500),
}

function readTimeout(name, fallback) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(value) || value < 1 || value > 4000) {
    throw new Error(`Configuración inválida: ${name}`)
  }
  return value
}

function readUrl(name, fallback) {
  try {
    const url = new URL(process.env[name] || fallback)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error()
    return url.origin
  } catch {
    throw new Error(`Configuración inválida: ${name}`)
  }
}
