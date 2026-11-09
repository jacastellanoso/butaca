import assert from 'node:assert/strict'
import { test } from 'node:test'

import { esErrorTransitorio, prepararCuenta } from './cuenta.js'

const error = (status, codigo = 'x') => Object.assign(new Error(codigo), { status, codigo })
const sinEspera = async () => {}

function secuencia(...resultados) {
  let llamada = 0
  const fn = async () => {
    const r = resultados[Math.min(llamada++, resultados.length - 1)]
    if (r instanceof Error) throw r
    return r
  }
  fn.llamadas = () => llamada
  return fn
}

test('reintenta mientras el servicio de Render despierta (502/503/sin conexión)', async () => {
  const sincronizar = secuencia(
    error(502), error(503), Object.assign(new Error(), { codigo: 'sin-conexion' }), error(504), { id: 'u1' },
  )
  const avisos = []
  const cuenta = await prepararCuenta({ sincronizar, esperar: sinEspera, alEsperar: (i) => avisos.push(i) })
  assert.deepEqual(cuenta, { id: 'u1' })
  assert.equal(sincronizar.llamadas(), 5)
  assert.deepEqual(avisos, [1, 2, 3, 4])
})

test('la espera total alcanza para un arranque en frío (más de 60 s)', async () => {
  let total = 0
  const sincronizar = secuencia(error(502))
  await assert.rejects(prepararCuenta({ sincronizar, esperar: async (ms) => { total += ms } }), { status: 502 })
  assert.ok(total >= 60000, `espera total ${total} ms`)
})

test('un 401 renueva el token una vez y vuelve a intentar', async () => {
  const sincronizar = secuencia(error(401), { id: 'u1' })
  let renovaciones = 0
  const cuenta = await prepararCuenta({
    sincronizar, esperar: sinEspera, renovarToken: async () => { renovaciones += 1; return true },
  })
  assert.deepEqual(cuenta, { id: 'u1' })
  assert.equal(renovaciones, 1)
})

test('un 401 persistente o un 400 no se reintentan indefinidamente', async () => {
  const rechazado = secuencia(error(401))
  await assert.rejects(
    prepararCuenta({ sincronizar: rechazado, esperar: sinEspera, renovarToken: async () => true }),
    { status: 401 },
  )
  assert.equal(rechazado.llamadas(), 2)

  const invalido = secuencia(error(400))
  await assert.rejects(prepararCuenta({ sincronizar: invalido, esperar: sinEspera }), { status: 400 })
  assert.equal(invalido.llamadas(), 1)
})

test('clasifica errores transitorios y definitivos', () => {
  for (const s of [429, 500, 502, 503, 504]) assert.equal(esErrorTransitorio(error(s)), true)
  for (const s of [400, 401, 403, 404]) assert.equal(esErrorTransitorio(error(s)), false)
  assert.equal(esErrorTransitorio(Object.assign(new Error(), { codigo: 'sin-conexion' })), true)
  assert.equal(esErrorTransitorio(null), false)
})
