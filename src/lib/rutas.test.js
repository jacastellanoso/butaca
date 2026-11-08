import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  esRutaInterna,
  leerRuta,
  rutaDeGrupo,
  rutaDeRecomendaciones,
  rutaDeSeccion,
  rutaDesdeHashLegado,
} from './rutas.js'

const animoId = '12345678-1234-1234-1234-123456789abc'

test('las pantallas conocidas se reconocen por su ruta', () => {
  assert.deepEqual(leerRuta('/galeria'), { pantalla: 'galeria' })
  assert.deepEqual(leerRuta('/rostro/'), { pantalla: 'rostro' })
  assert.deepEqual(leerRuta('/perfiles'), { pantalla: 'perfiles' })
  assert.deepEqual(leerRuta('/privacidad'), { pantalla: 'privacidad' })
  assert.deepEqual(leerRuta('/terminos'), { pantalla: 'terminos' })
})

test('dashboard, historial y favoritos abren la sección correspondiente', () => {
  assert.deepEqual(leerRuta('/dashboard'), { pantalla: 'dashboard', seccion: 'emociones' })
  assert.deepEqual(leerRuta('/historial'), { pantalla: 'dashboard', seccion: 'historial' })
  assert.deepEqual(leerRuta('/favoritos'), { pantalla: 'dashboard', seccion: 'favoritos' })
})

test('recomendaciones acepta una emoción válida o un animoId UUID', () => {
  assert.deepEqual(leerRuta('/recomendaciones'), { pantalla: 'dashboard', seccion: 'recomendaciones' })
  assert.deepEqual(leerRuta('/recomendaciones/emocion/happy'), {
    pantalla: 'dashboard', seccion: 'recomendaciones', emocion: 'happy',
  })
  assert.deepEqual(leerRuta(`/recomendaciones/animo/${animoId.toUpperCase()}`), {
    pantalla: 'dashboard', seccion: 'recomendaciones', animoId,
  })
})

test('parámetros inválidos de recomendaciones se ignoran', () => {
  assert.deepEqual(leerRuta('/recomendaciones/emocion/euforia'), { pantalla: 'dashboard', seccion: 'recomendaciones' })
  assert.deepEqual(leerRuta('/recomendaciones/animo/123'), { pantalla: 'dashboard', seccion: 'recomendaciones' })
})

test('rutas desconocidas, la raíz y el retorno de OAuth llevan a inicio', () => {
  assert.deepEqual(leerRuta('/'), { pantalla: 'inicio' })
  assert.deepEqual(leerRuta(''), { pantalla: 'inicio' })
  assert.deepEqual(leerRuta('/?code=abc'), { pantalla: 'inicio' })
  assert.deepEqual(leerRuta('/admin'), { pantalla: 'inicio' })
})

test('las rutas generadas vuelven a leerse igual', () => {
  assert.equal(rutaDeSeccion('emociones'), '/dashboard')
  assert.equal(rutaDeSeccion('favoritos'), '/favoritos')
  assert.equal(rutaDeRecomendaciones({ emocion: 'sad' }), '/recomendaciones/emocion/sad')
  assert.equal(rutaDeRecomendaciones({ animoId, emocion: 'sad' }), `/recomendaciones/animo/${animoId}`)
  assert.equal(rutaDeRecomendaciones({ emocion: 'x' }), '/recomendaciones')
  assert.deepEqual(leerRuta(rutaDeRecomendaciones({ animoId })).animoId, animoId)
})

test('grupos acepta la lista o un grupo por UUID', () => {
  assert.deepEqual(leerRuta('/grupos'), { pantalla: 'grupos' })
  assert.deepEqual(leerRuta(`/grupos/${animoId.toUpperCase()}`), { pantalla: 'grupos', grupoId: animoId })
  assert.deepEqual(leerRuta('/grupos/no-es-uuid'), { pantalla: 'grupos' })
  assert.equal(rutaDeGrupo(animoId), `/grupos/${animoId}`)
  assert.equal(rutaDeGrupo('x'), '/grupos')
  assert.deepEqual(leerRuta(rutaDeGrupo(animoId)), { pantalla: 'grupos', grupoId: animoId })
})

test('los enlaces antiguos con # se convierten a la ruta nueva', () => {
  assert.equal(rutaDesdeHashLegado('#grupos'), '/grupos')
  assert.equal(rutaDesdeHashLegado(`#grupos/${animoId}`), `/grupos/${animoId}`)
  assert.equal(rutaDesdeHashLegado('#/perfiles'), '/perfiles')
  assert.equal(rutaDesdeHashLegado('#recomendaciones/emocion/happy'), '/recomendaciones/emocion/happy')
  assert.equal(rutaDesdeHashLegado('#favoritos/'), '/favoritos')
  // El hash de OAuth, un ancla o nada: no se tocan.
  assert.equal(rutaDesdeHashLegado('#access_token=abc&token_type=bearer'), null)
  assert.equal(rutaDesdeHashLegado('#responsable'), null)
  assert.equal(rutaDesdeHashLegado(''), null)
  // La lectura antigua por hash sigue dando la misma pantalla.
  assert.deepEqual(leerRuta('#favoritos'), leerRuta('/favoritos'))
})

test('solo las rutas de Butaca se navegan sin recargar', () => {
  assert.equal(esRutaInterna('/'), true)
  assert.equal(esRutaInterna('/grupos'), true)
  assert.equal(esRutaInterna(`/grupos/${animoId}`), true)
  assert.equal(esRutaInterna('/privacidad'), true)
  assert.equal(esRutaInterna('/assets/index.js'), false)
  assert.equal(esRutaInterna('/models/tiny.json'), false)
  assert.equal(esRutaInterna('https://example.com/grupos'), false)
  assert.equal(esRutaInterna('#grupos'), false)
})
