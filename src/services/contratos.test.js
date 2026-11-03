import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  adaptarListadoAnimos,
  adaptarListadoFavoritos,
  adaptarListadoHistorial,
  construirQueryHistorial,
  RespuestaInvalidaError,
} from './contratos.js'

const id = '12345678-1234-1234-1234-123456789abc'
const paginacion = { pagina: 1, limite: 20, total: 1, totalPaginas: 1 }
const animo = {
  id, emocion: 'happy', confianza: 0.91, origen: 'deteccion', consentimientoHistorial: true,
  consentimientoVersion: 'historial-v1', consentimientoEn: '2026-11-02T19:00:00.000Z', creadoEn: '2026-11-02T19:00:00.000Z',
}
const favorito = { id, tmdbId: 550, tipo: 'movie', titulo: 'Fight Club', poster: null, creadoEn: '2026-11-02T19:00:00.000Z' }
const historial = { ...favorito, emocion: 'sad', tipo: 'tv', calificacion: 8.4 }

test('GET /api/animos se adapta respetando { resultados, paginacion }', () => {
  const { resultados, paginacion: pag } = adaptarListadoAnimos({ resultados: [animo], paginacion })
  assert.equal(resultados[0].emocion, 'happy')
  assert.ok(resultados[0].creadoEn instanceof Date)
  assert.equal('usuarioId' in resultados[0], false)
  assert.deepEqual(pag, paginacion)
})

test('se rechazan registros sin consentimiento, emociones desconocidas o fechas inválidas', () => {
  for (const cambio of [{ consentimientoHistorial: false }, { emocion: 'euforia' }, { creadoEn: 'ayer' }, { confianza: 2 }]) {
    assert.throws(() => adaptarListadoAnimos({ resultados: [{ ...animo, ...cambio }], paginacion }), RespuestaInvalidaError)
  }
  assert.throws(() => adaptarListadoAnimos({ resultados: [animo] }), RespuestaInvalidaError)
  assert.throws(() => adaptarListadoAnimos(null), RespuestaInvalidaError)
})

test('favoritos e historial convierten el tipo de TMDB a etiqueta', () => {
  const [fav] = adaptarListadoFavoritos({ resultados: [favorito], paginacion }).resultados
  assert.equal(fav.tipoTmdb, 'movie')
  assert.equal(fav.tipo, 'Película')
  const [hist] = adaptarListadoHistorial({ resultados: [historial], paginacion }).resultados
  assert.equal(hist.tipo, 'Serie')
  assert.equal(hist.calificacion, 8.4)
  assert.throws(() => adaptarListadoFavoritos({ resultados: [{ ...favorito, tmdbId: 0 }], paginacion }), RespuestaInvalidaError)
})

test('la query de historial convierte fechas locales a ISO y omite filtros vacíos', () => {
  const query = construirQueryHistorial({
    pagina: 2, limite: 20, emocion: 'sad', tipo: '', desde: '2026-11-01', hasta: '2026-11-02', orden: 'desc',
  })
  assert.equal(query.get('pagina'), '2')
  assert.equal(query.get('emocion'), 'sad')
  assert.equal(query.has('tipo'), false)
  assert.equal(query.get('desde'), new Date(2026, 10, 1, 0, 0, 0, 0).toISOString())
  assert.equal(query.get('hasta'), new Date(2026, 10, 2, 23, 59, 59, 999).toISOString())
  assert.equal(construirQueryHistorial({ emocion: 'x', desde: '01/11/2026' }).toString(), '')
})
