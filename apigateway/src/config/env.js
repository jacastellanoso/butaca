import 'dotenv/config'

function readPositiveInteger(value, fallback) {
  const parsedValue = Number(value)

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback
}

function readServiceUrl(value, fallback) {
  const serviceUrl = value || fallback

  try {
    return new URL(serviceUrl).origin
  } catch {
    throw new Error(`URL de microservicio inválida: ${serviceUrl}`)
  }
}

export const env = {
  port: readPositiveInteger(process.env.GATEWAY_PORT, 3000),
  proxyTimeoutMs: readPositiveInteger(process.env.PROXY_TIMEOUT_MS, 5000),
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
