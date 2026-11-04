// Rate limit del gateway (pf23) con límites bajos para poder alcanzarlos.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { apuntarServicios, crearServicioFalso } from './apoyo.js'

const falso = await crearServicioFalso()
apuntarServicios(falso.url)
process.env.RATE_LIMIT_MAX = '5'
process.env.RATE_LIMIT_WRITE_MAX = '2'

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

test('las escrituras tienen un límite propio más estricto', async () => {
  const estados = []
  for (let i = 0; i < 3; i += 1) {
    const res = await fetch(`${base}/api/favoritos`, { method: 'POST', headers: conToken })
    estados.push(res.status)
  }
  assert.deepEqual(estados, [200, 200, 429])
})

test('pasado el límite general responde 429 con RateLimit y Retry-After', async () => {
  // Ya se hicieron 3 peticiones /api en la prueba anterior (misma IP).
  const estados = []
  let ultima
  for (let i = 0; i < 3; i += 1) {
    ultima = await fetch(`${base}/api/catalogo`)
    estados.push(ultima.status)
  }

  assert.deepEqual(estados, [200, 200, 429])
  assert.deepEqual(await ultima.json(), { error: 'Demasiadas solicitudes. Esperá un momento e intentá de nuevo.' })
  assert.match(ultima.headers.get('ratelimit-policy'), /q=5/)
  assert.ok(Number(ultima.headers.get('retry-after')) > 0)
})

test('/health no cuenta para el límite (Docker y Render lo consultan seguido)', async () => {
  const res = await fetch(`${base}/health`)
  assert.equal(res.status, 200)
})