import assert from 'node:assert/strict'
import { test } from 'node:test'

import { confianzaPromedio, distribucion, emocionMasFrecuente, serieTemporal } from './estadisticas.js'

const registro = (emocion, fecha, confianza = 0.8) => ({ emocion, confianza, creadoEn: new Date(fecha) })

test('sin registros no hay estadísticas', () => {
  assert.deepEqual(distribucion([]), [])
  assert.equal(emocionMasFrecuente([]), null)
  assert.equal(confianzaPromedio([]), null)
  assert.deepEqual(serieTemporal([]), { agrupacion: 'dia', periodos: [] })
})

test('la distribución cuenta, calcula porcentajes y ordena de mayor a menor', () => {
  const registros = [
    registro('sad', '2026-11-01T09:00', 0.5), registro('happy', '2026-11-01T10:00'),
    registro('happy', '2026-11-02T10:00'), registro('happy', '2026-11-02T11:00'),
  ]
  assert.deepEqual(distribucion(registros), [
    { emocion: 'happy', cantidad: 3, porcentaje: 0.75 },
    { emocion: 'sad', cantidad: 1, porcentaje: 0.25 },
  ])
})

test('la emoción más frecuente desempata por el registro más reciente', () => {
  const registros = [
    registro('sad', '2026-11-01T09:00'), registro('happy', '2026-11-01T10:00'),
    registro('sad', '2026-11-01T11:00'), registro('happy', '2026-11-02T12:00'),
  ]
  assert.deepEqual(emocionMasFrecuente(registros), { emocion: 'happy', cantidad: 2, porcentaje: 0.5 })
})

test('la confianza promedio ignora emociones confirmadas sin confianza', () => {
  const registros = [registro('happy', '2026-11-01', 0.6), registro('sad', '2026-11-01', null), registro('sad', '2026-11-01', 1)]
  assert.equal(confianzaPromedio(registros), 0.8)
})

test('la serie diaria rellena con ceros los días sin registros', () => {
  const { agrupacion, periodos } = serieTemporal([
    registro('happy', '2026-11-01T10:00'), registro('sad', '2026-11-03T22:00'), registro('sad', '2026-11-03T08:00'),
  ])
  assert.equal(agrupacion, 'dia')
  assert.deepEqual(periodos.map((p) => [p.clave, p.total]), [['2026-11-01', 1], ['2026-11-02', 0], ['2026-11-03', 2]])
  assert.deepEqual(periodos[2].conteos, { sad: 2 })
})

test('rangos largos se agrupan por semana o por mes', () => {
  const semanal = serieTemporal([registro('happy', '2026-08-03T10:00'), registro('sad', '2026-10-30T10:00')])
  assert.equal(semanal.agrupacion, 'semana')
  assert.equal(semanal.periodos[0].clave, '2026-08-03')
  assert.equal(semanal.periodos.reduce((suma, p) => suma + p.total, 0), 2)

  const mensual = serieTemporal([registro('happy', '2026-01-15T10:00'), registro('sad', '2026-11-02T10:00')])
  assert.equal(mensual.agrupacion, 'mes')
  assert.equal(mensual.periodos.length, 11)
  assert.equal(mensual.periodos[0].clave, '2026-01-01')
})
