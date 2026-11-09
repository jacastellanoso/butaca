import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

import { despertarServicio, despertarSiHaceFalta, olvidarDespertares, urlDespertarValida } from './despertar.js'

const URL_CATALOGO = 'https://butaca-catalog-7rkz.onrender.com/health'

beforeEach(() => olvidarDespertares())

test('solo se aceptan URLs https de Render que apuntan a /health', () => {
  assert.equal(urlDespertarValida(URL_CATALOGO), URL_CATALOGO)
  for (const mala of ['http://butaca.onrender.com/health', 'https://evil.example.com/health', 'https://x.onrender.com/api/usuarios',
    'https://x.onrender.com/health?a=1', 'no es url', '', null]) {
    assert.equal(urlDespertarValida(mala), null, String(mala))
  }
})

test('despierta el servicio con una petición no-cors, como máximo cada 20 s', async () => {
  const pedidos = []
  const pedir = async (url, opciones) => { pedidos.push([url, opciones.mode]) }
  assert.equal(despertarServicio(URL_CATALOGO, { ahora: 0, pedir }), true)
  assert.equal(despertarServicio(URL_CATALOGO, { ahora: 5_000, pedir }), false)
  assert.equal(despertarServicio(URL_CATALOGO, { ahora: 21_000, pedir }), true)
  await new Promise((r) => setTimeout(r, 0))
  assert.deepEqual(pedidos, [[URL_CATALOGO, 'no-cors'], [URL_CATALOGO, 'no-cors']])
})

test('lee X-Butaca-Despertar de la respuesta del gateway; sin él no hace nada', async () => {
  const pedidos = []
  const pedir = async (url) => { pedidos.push(url) }
  const con = { headers: new Headers({ 'x-butaca-despertar': URL_CATALOGO }) }
  const sin = { headers: new Headers() }
  assert.equal(despertarSiHaceFalta(sin, { pedir }), false)
  assert.equal(despertarSiHaceFalta(con, { pedir }), true)
  assert.equal(despertarSiHaceFalta({ headers: new Headers({ 'x-butaca-despertar': 'https://evil.example.com/health' }) }, { pedir }), false)
  await new Promise((r) => setTimeout(r, 0))
  assert.deepEqual(pedidos, [URL_CATALOGO])
})

test('un fallo al despertar nunca rompe la aplicación', async () => {
  assert.equal(despertarServicio(URL_CATALOGO, { pedir: async () => { throw new TypeError('red') } }), true)
  await new Promise((r) => setTimeout(r, 0))
})
