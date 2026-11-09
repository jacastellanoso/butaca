import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  esIdValido, validarConsultaFavoritos, validarConsultaHistorial, validarNuevoFavorito, validarNuevoHistorial,
} from '../src/validators/biblioteca.validator.js'

const contenido = { tmdbId: 550, tipo: 'movie', titulo: ' Matrix ' }
const fallo = (error) => ({ status: 400, error })
test('favorito conserva recorte, null y elimina identidad e imágenes desconocidas', () => {
  assert.deepEqual(validarNuevoFavorito({ ...contenido, usuarioId: 'otro', imagen: 'ignorada' }),
    { datos: { tmdbId: 550, tipo: 'movie', titulo: 'Matrix', poster: null } })
})
test('historial conserva opcionales nulos y redondeo a un decimal', () => {
  for (const calificacion of [undefined, null, 0, 10, 8.46]) {
    assert.deepEqual(validarNuevoHistorial({ ...contenido, emocion: 'happy', calificacion }),
      { datos: { emocion: 'happy', tmdbId: 550, tipo: 'movie', titulo: 'Matrix', poster: null,
        calificacion: calificacion == null ? null : Math.round(calificacion * 10) / 10 } })
  }
})
for (const tmdbId of ['550', 0, 1.5, 1_000_000_000, NaN, Infinity, undefined, null]) {
  test(`rechaza TMDB no entero numérico válido ${tmdbId}`, () => {
    assert.deepEqual(validarNuevoFavorito({ ...contenido, tmdbId }), fallo('tmdbId debe ser un entero entre 1 y 999999999.'))
  })
}
test('acepta límites de TMDB, título y póster recortados', () => {
  for (const tmdbId of [1, 999_999_999]) {
    const resultado = validarNuevoFavorito({ tmdbId, tipo: 'tv', titulo: ` ${'t'.repeat(250)} `, poster: ` ${'p'.repeat(500)} ` })
    assert.equal(resultado.datos.titulo.length, 250)
    assert.equal(resultado.datos.poster.length, 500)
  }
})
test('cuerpos inválidos y prioridad de campos conservan mensajes', () => {
  for (const validar of [validarNuevoFavorito, validarNuevoHistorial]) {
    for (const body of [undefined, null, [], 'texto', 1]) {
      assert.deepEqual(validar(body), fallo('El cuerpo debe ser un objeto JSON.'))
    }
  }
  assert.deepEqual(validarNuevoHistorial({}), fallo('La emoción no es válida.'))
  assert.deepEqual(validarNuevoFavorito({}), fallo('tmdbId debe ser un entero entre 1 y 999999999.'))
  assert.deepEqual(validarNuevoFavorito({ ...contenido, tipo: 'all', titulo: '' }), fallo('El tipo debe ser "movie" o "tv".'))
})
test('título y póster conservan mensajes exactos', () => {
  for (const titulo of [undefined, null, 1, '  ']) {
    assert.deepEqual(validarNuevoFavorito({ ...contenido, titulo }), fallo('El título es obligatorio.'))
  }
  assert.deepEqual(validarNuevoFavorito({ ...contenido, titulo: 't'.repeat(251) }), fallo('El título no puede superar los 250 caracteres.'))
  assert.deepEqual(validarNuevoFavorito({ ...contenido, poster: 1 }), fallo('El póster debe ser una cadena de texto o nulo.'))
  assert.deepEqual(validarNuevoFavorito({ ...contenido, poster: '  ' }), fallo('El póster no puede ser una cadena vacía.'))
  assert.deepEqual(validarNuevoFavorito({ ...contenido, poster: 'p'.repeat(501) }), fallo('El póster no puede superar los 500 caracteres.'))
})
test('calificación rechaza cadenas y valores no finitos o fuera del rango', () => {
  for (const calificacion of ['8', NaN, Infinity, -0.01, 10.01]) {
    assert.deepEqual(validarNuevoHistorial({ ...contenido, emocion: 'happy', calificacion }), fallo('La calificación debe ser un número entre 0 y 10.'))
  }
})
test('consultas conservan defaults, claves undefined y desconocidos ignorados', () => {
  assert.deepEqual(validarConsultaFavoritos({ extra: ['ignorado'] }),
    { datos: { pagina: 1, limite: 20, tipo: undefined, orden: 'desc' } })
  assert.deepEqual(validarConsultaHistorial(), { datos: {
    pagina: 1, limite: 20, emocion: undefined, tipo: undefined, desde: undefined, hasta: undefined, orden: 'desc',
  } })
})
test('consultas aceptan límites y rechazan espacios, repetidos y coerción', () => {
  for (const validar of [validarConsultaFavoritos, validarConsultaHistorial]) {
    assert.equal(validar({ pagina: '10000', limite: '100' }).datos.pagina, 10000)
    assert.equal(validar({ pagina: '0001' }).datos.pagina, 1)
    for (const pagina of ['0', '10001', ' 1 ', '1.0', '1e2', '']) {
      assert.deepEqual(validar({ pagina }), fallo('El parámetro pagina debe ser un entero entre 1 y 10000.'))
    }
    for (const pagina of [1, null, ['1', '2']]) {
      assert.deepEqual(validar({ pagina }), fallo('El parámetro pagina no es válido.'))
    }
    assert.deepEqual(validar({ limite: '101' }), fallo('El parámetro limite debe ser un entero entre 1 y 100.'))
    assert.deepEqual(validar({ tipo: 'all' }), fallo('El parámetro tipo no es válido.'))
    assert.deepEqual(validar({ orden: 'otro' }), fallo('El parámetro orden no es válido.'))
  }
})
test('historial conserva parsing de fechas y prioridad de errores', () => {
  assert.deepEqual(validarConsultaHistorial({ desde: 'January 1, 2026' }).datos.desde, new Date('January 1, 2026'))
  assert.deepEqual(validarConsultaHistorial({ desde: 'inválida' }), fallo('El parámetro desde debe ser una fecha ISO 8601.'))
  assert.deepEqual(validarConsultaHistorial({ desde: '2026-02-01', hasta: '2026-01-01' }), fallo('El parámetro desde no puede ser posterior a hasta.'))
  assert.deepEqual(validarConsultaHistorial({ pagina: '0', desde: 'inválida' }), fallo('El parámetro pagina debe ser un entero entre 1 y 10000.'))
})
test('UUID mantiene versiones previas y requiere cadena', () => {
  assert.equal(esIdValido('ABCDEF01-0000-0000-0000-000000000000'), true)
  for (const id of [undefined, null, [], '550', '']) assert.equal(esIdValido(id), false)
})
