import assert from 'node:assert/strict'
import { test } from 'node:test'

import { elegirDelDia, fechaLocal } from './notificaciones.js'

const lista = Array.from({ length: 15 }, (_, i) => ({ id: `movie-${i}`, titulo: `T${i}` }))

test('la recomendación del día es estable para el mismo perfil y fecha', () => {
  const a = elegirDelDia(lista, '2026-11-08', 'perfil-1')
  assert.deepEqual(elegirDelDia(lista, '2026-11-08', 'perfil-1'), a)
  // Solo entre las 10 primeras (las mejor ubicadas para la emoción).
  assert.ok(lista.slice(0, 10).includes(a))
})

test('la recomendación del día varía entre días o perfiles', () => {
  const elegidos = new Set()
  for (let dia = 1; dia <= 20; dia++) elegidos.add(elegirDelDia(lista, `2026-11-${String(dia).padStart(2, '0')}`, 'perfil-1').id)
  assert.ok(elegidos.size > 1)
  const porPerfil = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((p) => elegirDelDia(lista, '2026-11-08', p).id))
  assert.ok(porPerfil.size > 1)
})

test('sin resultados no hay recomendación del día', () => {
  assert.equal(elegirDelDia([], '2026-11-08', 'p'), null)
  assert.equal(elegirDelDia(null, '2026-11-08', 'p'), null)
})

test('la fecha local usa el formato YYYY-MM-DD de la zona horaria del navegador', () => {
  assert.equal(fechaLocal(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
})
