import assert from 'node:assert/strict'
import { test } from 'node:test'

import { claveFiltros, combinarPagina, esFalloTransitorio, hayMasPaginas, pedirConReintentos } from './paginacion.js'

const t = (id, generos = ['Drama']) => ({ id, generos })

test('agregar una página conserva las anteriores y no repite títulos', () => {
  const pagina1 = [t('movie-1'), t('tv-2')]
  const pagina2 = [t('tv-2'), t('movie-3'), t('movie-3'), t('movie-4')]
  assert.deepEqual(combinarPagina(pagina1, pagina2).map((c) => c.id), ['movie-1', 'tv-2', 'movie-3', 'movie-4'])
})

test('con una categoría elegida solo se agregan títulos de esa categoría', () => {
  const nuevos = [t('movie-1', ['Terror']), t('movie-2', ['Comedia']), t('movie-3', ['Terror', 'Drama'])]
  assert.deepEqual(combinarPagina([], nuevos, 'Terror').map((c) => c.id), ['movie-1', 'movie-3'])
})

test('registros sin id se ignoran', () => {
  assert.deepEqual(combinarPagina([], [null, {}, t('movie-1')]).map((c) => c.id), ['movie-1'])
})

test('hay más páginas solo mientras la actual sea menor que el total', () => {
  assert.equal(hayMasPaginas({ pagina: 1, totalPaginas: 500 }), true)
  assert.equal(hayMasPaginas({ pagina: 500, totalPaginas: 500 }), false)
  assert.equal(hayMasPaginas({ pagina: 1, totalPaginas: 1 }), false)
  assert.equal(hayMasPaginas({}), false)
})

const fallo = (status) => Object.assign(new Error(String(status)), { status })

test('reintenta mientras el catálogo despierta y carga solo, sin pedir Reintentar', async () => {
  let llamadas = 0
  const avisos = []
  const resultado = await pedirConReintentos(async () => {
    llamadas += 1
    if (llamadas < 4) throw llamadas === 2 ? Object.assign(new Error(), { codigo: 'sin-conexion' }) : fallo(502)
    return 'películas'
  }, { esperar: async () => {}, alEsperar: (i) => avisos.push(i) })
  assert.equal(resultado, 'películas')
  assert.equal(llamadas, 4)
  assert.deepEqual(avisos, [1, 2, 3])
})

test('no reintenta para siempre: tras ~70 s devuelve el último error', async () => {
  let total = 0
  let llamadas = 0
  await assert.rejects(pedirConReintentos(async () => { llamadas += 1; throw fallo(503) }, {
    esperar: async (ms) => { total += ms },
  }), { status: 503 })
  assert.equal(llamadas, 9)
  assert.ok(total >= 60000 && total <= 90000, `espera total ${total}`)
})

test('un error permanente (500, 400) no se oculta tras una espera', async () => {
  for (const status of [500, 400, 404]) {
    let llamadas = 0
    await assert.rejects(pedirConReintentos(async () => { llamadas += 1; throw fallo(status) }, { esperar: async () => {} }), { status })
    assert.equal(llamadas, 1)
  }
  assert.equal(esFalloTransitorio(fallo(502)), true)
  assert.equal(esFalloTransitorio(fallo(500)), false)
})

test('cada combinación de filtros tiene su clave; la búsqueda ignora mayúsculas y espacios', () => {
  assert.equal(claveFiltros({ categoria: 'Todos', busqueda: ' Coco ' }), claveFiltros({ busqueda: 'coco' }))
  assert.notEqual(claveFiltros({ emocion: 'happy' }), claveFiltros({ emocion: 'sad' }))
  assert.notEqual(claveFiltros({ categoria: 'Drama' }), claveFiltros({}))
})
