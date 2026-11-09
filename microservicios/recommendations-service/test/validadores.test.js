import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validarConsulta } from '../src/validators/recomendaciones.validator.js'

const id = 'ABCDEF01-0000-0000-0000-000000000000'
const emociones = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
for (const emocion of emociones) {
  test(`acepta ${emocion} y tipo por defecto`, () => {
    assert.deepEqual(validarConsulta({ emocion }), { datos: { emocion, animoId: undefined, tipo: 'movie' } })
  })
}
test('acepta animoId con versión UUID previa y tipo tv', () => {
  assert.deepEqual(validarConsulta({ animoId: id, tipo: 'tv' }), { datos: { emocion: undefined, animoId: id, tipo: 'tv' } })
})
for (const query of [{}, { emocion: 'happy', animoId: id }, { emocion: '', animoId: '' }]) {
  test(`exige exactamente una fuente ${JSON.stringify(query)}`, () => {
    assert.deepEqual(validarConsulta(query), { error: 'Indicá exactamente uno de emocion o animoId.' })
  })
}
test('desconocidos, repetidos y tipos incorrectos preceden al resto de errores', () => {
  for (const query of [
    { extra: 'x' }, { emocion: ['happy', 'sad'] }, { emocion: 'happy', tipo: ['movie', 'tv'] },
    { emocion: null }, { animoId: 123 }, { emocion: 'happy', extra: undefined },
  ]) assert.deepEqual(validarConsulta(query), { error: 'Los parámetros deben ser conocidos y no repetirse.' })
})
test('valores vacíos, espacios y UUID inválido conservan mensajes', () => {
  for (const emocion of ['', 'Happy', ' happy ', 'otra']) {
    assert.deepEqual(validarConsulta({ emocion, tipo: 'otro' }), { error: 'La emoción no es válida.' })
  }
  for (const animoId of ['', '550', ` ${id} `]) {
    assert.deepEqual(validarConsulta({ animoId, tipo: 'otro' }), { error: 'animoId debe ser un UUID.' })
  }
  assert.deepEqual(validarConsulta({ emocion: 'happy', tipo: '' }), { error: 'El tipo debe ser movie o tv.' })
})
