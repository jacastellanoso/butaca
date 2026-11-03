import assert from 'node:assert/strict'
import { test } from 'node:test'

import { hashDeRecomendaciones, hashDeSeccion, leerRuta } from './rutas.js'

const animoId = '12345678-1234-1234-1234-123456789abc'

test('las pantallas conocidas se reconocen con o sin barra inicial', () => {
  assert.deepEqual(leerRuta('#galeria'), { pantalla: 'galeria' })
  assert.deepEqual(leerRuta('#/rostro'), { pantalla: 'rostro' })
  assert.deepEqual(leerRuta('#perfiles'), { pantalla: 'perfiles' })
})

test('dashboard, historial y favoritos abren la sección correspondiente', () => {
  assert.deepEqual(leerRuta('#dashboard'), { pantalla: 'dashboard', seccion: 'emociones' })
  assert.deepEqual(leerRuta('#historial'), { pantalla: 'dashboard', seccion: 'historial' })
  assert.deepEqual(leerRuta('#favoritos'), { pantalla: 'dashboard', seccion: 'favoritos' })
})

test('recomendaciones acepta una emoción válida o un animoId UUID', () => {
  assert.deepEqual(leerRuta('#recomendaciones'), { pantalla: 'dashboard', seccion: 'recomendaciones' })
  assert.deepEqual(leerRuta('#recomendaciones/emocion/happy'), {
    pantalla: 'dashboard', seccion: 'recomendaciones', emocion: 'happy',
  })
  assert.deepEqual(leerRuta(`#recomendaciones/animo/${animoId.toUpperCase()}`), {
    pantalla: 'dashboard', seccion: 'recomendaciones', animoId,
  })
})

test('parámetros inválidos de recomendaciones se ignoran', () => {
  assert.deepEqual(leerRuta('#recomendaciones/emocion/euforia'), { pantalla: 'dashboard', seccion: 'recomendaciones' })
  assert.deepEqual(leerRuta('#recomendaciones/animo/123'), { pantalla: 'dashboard', seccion: 'recomendaciones' })
})

test('hashes desconocidos y el retorno de OAuth llevan a inicio', () => {
  assert.deepEqual(leerRuta(''), { pantalla: 'inicio' })
  assert.deepEqual(leerRuta('#'), { pantalla: 'inicio' })
  assert.deepEqual(leerRuta('#access_token=abc&token_type=bearer'), { pantalla: 'inicio' })
  assert.deepEqual(leerRuta('#admin'), { pantalla: 'inicio' })
})

test('los hashes generados vuelven a leerse igual', () => {
  assert.equal(hashDeSeccion('emociones'), '#dashboard')
  assert.equal(hashDeSeccion('favoritos'), '#favoritos')
  assert.equal(hashDeRecomendaciones({ emocion: 'sad' }), '#recomendaciones/emocion/sad')
  assert.equal(hashDeRecomendaciones({ animoId, emocion: 'sad' }), `#recomendaciones/animo/${animoId}`)
  assert.equal(hashDeRecomendaciones({ emocion: 'x' }), '#recomendaciones')
  assert.deepEqual(leerRuta(hashDeRecomendaciones({ animoId })).animoId, animoId)
})
