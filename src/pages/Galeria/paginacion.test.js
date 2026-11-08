import assert from 'node:assert/strict'
import { test } from 'node:test'

import { combinarPagina, hayMasPaginas } from './paginacion.js'

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
