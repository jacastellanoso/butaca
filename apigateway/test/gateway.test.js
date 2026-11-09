import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'

let receivedRequest

const upstreamServer = createServer((req, res) => {
  const chunks = []

  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    // Render con el servicio dormido: 502 HTML inmediato con x-render-routing.
    if (req.url.startsWith('/api/catalogo/dormido')) {
      res.writeHead(502, { 'Content-Type': 'text/html', 'x-render-routing': 'no-deploy' })
      res.end('<!DOCTYPE html><title>502</title>')
      return
    }
    if (req.url.startsWith('/api/catalogo/fallo-propio')) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end('{"error":"TMDB"}')
      return
    }
    receivedRequest = {
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      ...(req.headers['x-butaca-perfil'] && { perfil: req.headers['x-butaca-perfil'] }),
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
  // Con token: desde pf23 el gateway rechaza antes (401) las rutas privadas sin token.
  const response = await fetch(`${baseUrl}/api/sesiones`, {
    headers: { Authorization: 'Bearer token-de-prueba' },
  })
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

test('las rutas de favoritos e historial llegan a library-service con su autorización', async () => {
  const favoritoPayload = { tmdbId: 550, tipo: 'movie', titulo: 'El club de la pelea' }
  const favResponse = await fetch(`${baseUrl}/api/favoritos?tipo=movie&pagina=1`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer token-de-prueba',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(favoritoPayload),
  })

  assert.equal(favResponse.status, 200)
  assert.deepEqual(await favResponse.json(), { proxied: true })
  assert.deepEqual(receivedRequest, {
    method: 'POST',
    url: '/api/favoritos?tipo=movie&pagina=1',
    authorization: 'Bearer token-de-prueba',
    body: JSON.stringify(favoritoPayload),
  })

  const histResponse = await fetch(
    `${baseUrl}/api/historial/00000000-0000-4000-8000-000000000001?emocion=happy`,
    {
      method: 'DELETE',
      headers: { Authorization: 'Bearer token-de-prueba' },
    },
  )

  assert.equal(histResponse.status, 200)
  assert.deepEqual(receivedRequest, {
    method: 'DELETE',
    url: '/api/historial/00000000-0000-4000-8000-000000000001?emocion=happy',
    authorization: 'Bearer token-de-prueba',
    body: '',
  })
})
test('grupos, invitaciones y notificaciones se dirigen a auth-service', async () => {
  // En esta suite auth-service apunta a un puerto cerrado: el 502 identifica el destino.
  for (const [method, ruta] of [
    ['GET', '/api/grupos'],
    ['POST', '/api/grupos/00000000-0000-4000-8000-000000000001/recomendaciones'],
    ['PUT', '/api/invitaciones/00000000-0000-4000-8000-000000000002'],
    ['PATCH', '/api/notificaciones/00000000-0000-4000-8000-000000000003'],
  ]) {
    const res = await fetch(`${baseUrl}${ruta}`, { method, headers: { Authorization: 'Bearer token-de-prueba' } })
    assert.equal(res.status, 502, ruta)
    assert.equal((await res.json()).service, 'auth-service', ruta)
  }
})

test('el encabezado del perfil activo se reenvía sin cambios al microservicio', async () => {
  const perfil = '0a000000-0000-4000-8000-00000000000a'
  const res = await fetch(`${baseUrl}/api/favoritos`, {
    headers: { Authorization: 'Bearer token-de-prueba', 'X-Butaca-Perfil': perfil },
  })
  assert.equal(res.status, 200)
  assert.equal(receivedRequest.perfil, perfil)
})

test('un servicio dormido en Render indica al navegador cómo despertarlo (solo URLs https)', async () => {
  const { urlParaDespertar } = await import('../src/routes/gateway.routes.js')
  assert.equal(urlParaDespertar({ target: 'https://butaca-catalog.onrender.com' }), 'https://butaca-catalog.onrender.com/health')
  assert.equal(urlParaDespertar({ target: 'http://catalog-service:3023' }), null)
  assert.equal(urlParaDespertar({ target: 'no es url' }), null)

  // En pruebas el destino es http local: no se expone ninguna URL para despertar.
  const dormido = await fetch(`${baseUrl}/api/catalogo/dormido`, { headers: { Origin: 'http://localhost:5173' } })
  assert.equal(dormido.status, 502)
  assert.equal(dormido.headers.get('x-butaca-despertar'), null)
  // El encabezado se expone por CORS para que el frontend pueda leerlo.
  assert.match(dormido.headers.get('access-control-expose-headers') ?? '', /X-Butaca-Despertar/)
})

test('solo el 502 de Render (x-render-routing) de un destino https recibe X-Butaca-Despertar', async () => {
  const { marcarServicioDormido } = await import('../src/routes/gateway.routes.js')
  const catalogo = { target: 'https://butaca-catalog.onrender.com' }
  const respuesta = (statusCode, headers) => ({ statusCode, headers })

  const dormido = respuesta(502, { 'x-render-routing': 'no-deploy' })
  marcarServicioDormido(dormido, catalogo)
  assert.equal(dormido.headers['x-butaca-despertar'], 'https://butaca-catalog.onrender.com/health')

  // Un 502 propio del servicio (TMDB caído) o una respuesta correcta no se marcan.
  for (const otra of [respuesta(502, {}), respuesta(200, { 'x-render-routing': 'x' }), respuesta(500, { 'x-render-routing': 'x' })]) {
    marcarServicioDormido(otra, catalogo)
    assert.equal(otra.headers['x-butaca-despertar'], undefined)
  }
})
