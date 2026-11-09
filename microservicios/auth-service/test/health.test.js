import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

process.env.SERVICE_NAME = 'servicio-de-prueba'

const { app } = await import('../src/app.js')

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => server.close())

test('GET /health responde 200 con el nombre del servicio', async () => {
  const res = await fetch(`${baseUrl}/health`)

  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { status: 'ok', service: 'servicio-de-prueba' })
})

test('una ruta inexistente responde 404 en JSON', async () => {
  const res = await fetch(`${baseUrl}/api/no-existe`)
  const body = await res.json()

  assert.equal(res.status, 404)
  assert.equal(body.service, 'servicio-de-prueba')
})

test('no expone el header X-Powered-By', async () => {
  const res = await fetch(`${baseUrl}/health`)

  assert.equal(res.headers.get('x-powered-by'), null)
})

// pf23: express.json({ limit: '10kb' }). Sin el manejo en errorHandler era un 500.
test('un body de más de 10kb responde 413 en JSON', async (t) => {
  t.mock.method(console, 'error', () => {})
  const res = await fetch(`${baseUrl}/api/no-existe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relleno: 'A'.repeat(20_000) }),
  })

  assert.equal(res.status, 413)
  assert.deepEqual(await res.json(), { error: 'El cuerpo de la petición es demasiado grande.' })
})