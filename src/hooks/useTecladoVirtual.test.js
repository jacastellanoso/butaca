import assert from 'node:assert/strict'
import { test } from 'node:test'

import { altoTecladoVisible } from './useTecladoVirtual.js'

test('teclado de iPhone abierto: se reserva el alto que tapa', () => {
  // iPhone 14: ventana de 844 px, teclado de ~336 px.
  assert.equal(altoTecladoVisible({ innerHeight: 844, visualHeight: 508, offsetTop: 0 }), 336)
})

test('con la página desplazada se descuenta el offset del viewport visual', () => {
  assert.equal(altoTecladoVisible({ innerHeight: 844, visualHeight: 508, offsetTop: 120 }), 216)
})

test('teclado cerrado o barras del navegador: sin espacio extra', () => {
  assert.equal(altoTecladoVisible({ innerHeight: 844, visualHeight: 844 }), 0)
  assert.equal(altoTecladoVisible({ innerHeight: 844, visualHeight: 790 }), 0)
  assert.equal(altoTecladoVisible({ innerHeight: Number.NaN, visualHeight: 500 }), 0)
})
