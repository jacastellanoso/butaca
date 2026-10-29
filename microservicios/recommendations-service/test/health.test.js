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