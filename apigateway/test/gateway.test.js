import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'

let receivedRequest

const upstreamServer = createServer((req, res) => {
  const chunks = []

  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    receivedRequest = {
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      body: Buffer.concat(chunks).toString('utf8'),
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ proxied: true }))
  })
})

await new Promise((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve))
const upstreamUrl = `http://127.0.0.1:${upstreamServer.address().port}`

process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:1'
process.env.EMOTIONS_SERVICE_URL = upstreamUrl
process.env.CATALOG_SERVICE_URL = upstreamUrl
process.env.RECOMMENDATIONS_SERVICE_URL = upstreamUrl
process.env.LIBRARY_SERVICE_URL = upstreamUrl
process.env.PROXY_TIMEOUT_MS = '250'

const { app } = await import('../src/app.js')

let server
let baseUrl

before(() => {
  server = app.listen(0)
  const { port } = server.address()
  baseUrl = `http://127.0.0.1:${port}`
})

after(
  () =>
    new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        upstreamServer.close((upstreamError) =>
          upstreamError ? reject(upstreamError) : resolve(),
        )
      })
    }),
)

test('GET /health describe el gateway y sus cinco microservicios', async () => {
  const response = await fetch(`${baseUrl}/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.status, 'ok')
  assert.equal(body.routes.length, 5)
})

test('una ruta desconocida responde 404 en JSON', async () => {
  const response = await fetch(`${baseUrl}/api/desconocida`)
  const body = await response.json()

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Ruta no encontrada en el API Gateway.')
})

test('un microservicio desconectado responde 502 de forma controlada', async () => {
  const response = await fetch(`${baseUrl}/api/sesiones`)
  const body = await response.json()

  assert.equal(response.status, 502)
  assert.equal(body.service, 'auth-service')
})

test('el proxy conserva método, ruta, query, body y autorización', async () => {
  const payload = { emocion: 'happy', confianza: 0.91 }
  const response = await fetch(`${baseUrl}/api/animos?fuente=camara`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer token-de-prueba',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { proxied: true })
  assert.deepEqual(receivedRequest, {
    method: 'POST',
    url: '/api/animos?fuente=camara',
    authorization: 'Bearer token-de-prueba',
    body: JSON.stringify(payload),
  })
})

test('las subrutas del historial emocional llegan a emotions-service sin cambios', async () => {
  const response = await fetch(
    `${baseUrl}/api/animos/00000000-0000-4000-8000-000000000001?pagina=2&limite=5`,
    { headers: { Authorization: 'Bearer token-de-prueba' } },
  )

  assert.equal(response.status, 200)
  assert.deepEqual(receivedRequest, {
    method: 'GET',
    url: '/api/animos/00000000-0000-4000-8000-000000000001?pagina=2&limite=5',
    authorization: 'Bearer token-de-prueba',
    body: '',
  })
})

test('las rutas y subrutas del catálogo llegan a catalog-service sin cambios', async () => {
  const listResponse = await fetch(`${baseUrl}/api/catalogo`)

  assert.equal(listResponse.status, 200)
  assert.deepEqual(receivedRequest, {
    method: 'GET',
    url: '/api/catalogo',
    authorization: undefined,
    body: '',
  })

  const detailResponse = await fetch(
    `${baseUrl}/api/catalogo/movie/550?categoria=${encodeURIComponent('Acción')}`,
  )

  assert.equal(detailResponse.status, 200)
  assert.equal(receivedRequest.method, 'GET')
  assert.equal(
    decodeURIComponent(receivedRequest.url),
    '/api/catalogo/movie/550?categoria=Acción',
  )
  assert.equal(receivedRequest.body, '')
})