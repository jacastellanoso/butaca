import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CONFIG_ANALISIS,
  debeTerminar,
  decidirResultado,
  normalizarMuestra,
  promediarMuestras,
} from './analizarExpresiones.js'

const base = { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 }
const muestra = (valores) => ({ ...base, ...valores })
const repetir = (valor, veces) => Array.from({ length: veces }, () => valor)

test('normalizarMuestra conserva solo las siete expresiones', () => {
  const resultado = normalizarMuestra({ ...muestra({ happy: 0.9 }), edad: 30, imagen: 'x' })

  assert.deepEqual(Object.keys(resultado).sort(), Object.keys(base).sort())
  assert.equal(resultado.happy, 0.9)
})

test('normalizarMuestra rechaza datos incompletos o no numéricos', () => {
  assert.equal(normalizarMuestra(null), null)
  assert.equal(normalizarMuestra({ happy: 0.9 }), null)
  assert.equal(normalizarMuestra(muestra({ sad: 'alto' })), null)
  assert.equal(normalizarMuestra(muestra({ sad: Number.NaN })), null)
})

test('normalizarMuestra recorta valores fuera de 0..1', () => {
  const resultado = normalizarMuestra(muestra({ happy: 1.2, sad: -0.1 }))

  assert.equal(resultado.happy, 1)
  assert.equal(resultado.sad, 0)
})

test('promediarMuestras elige la emoción con mayor promedio, no el pico de un fotograma', () => {
  const muestras = [
    muestra({ surprised: 0.99, happy: 0.01 }),
    ...repetir(muestra({ happy: 0.8, surprised: 0.2 }), 4),
  ]

  const { emocion, confianza } = promediarMuestras(muestras)

  assert.equal(emocion, 'happy')
  assert.ok(Math.abs(confianza - (0.01 + 0.8 * 4) / 5) < 1e-9)
})

test('promediarMuestras devuelve null sin muestras', () => {
  assert.equal(promediarMuestras([]), null)
})

test('decidirResultado: con pocas muestras es inconcluso', () => {
  const muestras = repetir(muestra({ happy: 0.95 }), CONFIG_ANALISIS.minimoMuestras - 1)

  assert.equal(decidirResultado(muestras).status, 'inconclusive')
})

test('decidirResultado: con confianza baja es inconcluso', () => {
  const muestras = repetir(muestra({ sad: 0.4, neutral: 0.35, happy: 0.25 }), 10)

  assert.equal(decidirResultado(muestras).status, 'inconclusive')
})

test('decidirResultado: con muestras claras devuelve el contrato de Rostro', () => {
  const muestras = repetir(muestra({ sad: 0.85, neutral: 0.15 }), 10)

  const resultado = decidirResultado(muestras)

  assert.equal(resultado.status, 'detected')
  assert.equal(resultado.emotion, 'sad')
  assert.ok(Math.abs(resultado.confidence - 0.85) < 1e-9)
})

test('debeTerminar: en un equipo rápido termina a los 3 s con muestras suficientes', () => {
  assert.equal(debeTerminar(2999, 15), false)
  assert.equal(debeTerminar(3000, 15), true)
})

test('debeTerminar: en un equipo lento sigue observando hasta juntar el mínimo', () => {
  assert.equal(debeTerminar(3500, CONFIG_ANALISIS.minimoMuestras - 1), false)
  assert.equal(debeTerminar(5000, CONFIG_ANALISIS.minimoMuestras), true)
})

test('debeTerminar: nunca supera la duración máxima aunque no haya rostro', () => {
  assert.equal(debeTerminar(CONFIG_ANALISIS.duracionMaximaMs, 0), true)
})