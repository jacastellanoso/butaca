// Pruebas de seguridad del gateway (pf23): casco (helmet), portero (CORS),
// tamaño del body, token en rutas privadas y aislamiento de CORS de los
// microservicios. El límite de peticiones se prueba en limite.test.js.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { apuntarServicios, crearServicioFalso } from './apoyo.js'

const PERMITIDO = 'http://localhost:5173'
const AJENO = 'https://sitio-malicioso.example'

const falso = await crearServicioFalso()
apuntarServicios(falso.url)
process.env.CORS_ORIGINS = `${PERMITIDO},https://butaca.onrender.com`
process.env.MAX_BODY_BYTES = '1024'

const { app } = await import('../src/app.js')

let server
let base
before(() => {
  server = app.listen(0)
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  server.close()
  falso.servidor.close()
})

const conToken = { Authorization: 'Bearer token-de-prueba' }

test('helmet: encabezados de seguridad y sin X-Powered-By', async () => {
  const res = await fetch(`${base}/health`)

  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN')
  assert.match(res.headers.get('strict-transport-security'), /max-age=\d+/)
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer')
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/)
  assert.equal(res.headers.get('x-powered-by'), null)
})

test('cors: el origen permitido recibe Access-Control-Allow-Origin', async () => {
  const res = await fetch(`${base}/api/catalogo`, { headers: { Origin: PERMITIDO } })

  assert.equal(res.status, 200)
  assert.equal(res.headers.get('access-control-allow-origin'), PERMITIDO)
  assert.equal(res.headers.get('vary'), 'Origin')
})

test('cors: un origen ajeno NO recibe autorización', async () => {
  const res = await fetch(`${base}/api/catalogo`, { headers: { Origin: AJENO } })

  assert.equal(res.headers.get('access-control-allow-origin'), null)
})

test('cors: el preflight permitido declara métodos y encabezados, y no llega al servicio', async () => {
  const antes = falso.recibidas.length
  const res = await fetch(`${base}/api/animos`, {
    method: 'OPTIONS',
    headers: {
      Origin: PERMITIDO,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  })

  assert.equal(res.status, 204)
  assert.equal(res.headers.get('access-control-allow-origin'), PERMITIDO)
  assert.match(res.headers.get('access-control-allow-methods'), /POST/)
  assert.match(res.headers.get('access-control-allow-headers'), /Authorization/i)
  assert.equal(falso.recibidas.length, antes)
})

test('cors: se descartan los encabezados CORS que agregue un microservicio', async () => {
  const res = await fetch(`${base}/api/catalogo`, { headers: { Origin: AJENO } })

  // El servicio falso respondió con Access-Control-Allow-Origin: * y X-Powered-By.
  assert.equal(res.headers.get('access-control-allow-origin'), null)
  assert.equal(res.headers.get('x-powered-by'), null)
})

test('rutas privadas sin token: 401 sin molestar al microservicio', async () => {
  const antes = falso.recibidas.length

  for (const ruta of ['/api/animos', '/api/favoritos', '/api/historial', '/api/recomendaciones?emocion=happy', '/api/usuarios', '/api/sesiones']) {
    const res = await fetch(`${base}${ruta}`)
    assert.equal(res.status, 401, ruta)
    assert.deepEqual(await res.json(), { error: 'Falta el token de sesión o su formato es incorrecto.' })
  }
  const malFormado = await fetch(`${base}/api/animos`, { headers: { Authorization: 'token-sin-bearer' } })
  assert.equal(malFormado.status, 401)

  assert.equal(falso.recibidas.length, antes)
})

test('rutas privadas con token y catálogo público llegan al microservicio', async () => {
  const privada = await fetch(`${base}/api/favoritos`, { headers: conToken })
  assert.equal(privada.status, 200)
  assert.equal(falso.recibidas.at(-1).authorization, 'Bearer token-de-prueba')

  const publica = await fetch(`${base}/api/catalogo/movie/550`)
  assert.equal(publica.status, 200)
})

test('una ruta inexistente sigue respondiendo 404 (no 401)', async () => {
  const res = await fetch(`${base}/api/no-existe`)
  assert.equal(res.status, 404)
})

test('un body más grande que MAX_BODY_BYTES se rechaza con 413', async () => {
  const antes = falso.recibidas.length
  const res = await fetch(`${base}/api/animos`, {
    method: 'POST',
    headers: { ...conToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ relleno: 'x'.repeat(2048) }),
  })

  assert.equal(res.status, 413)
  assert.equal(falso.recibidas.length, antes)
})