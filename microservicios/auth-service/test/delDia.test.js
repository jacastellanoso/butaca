import assert from 'node:assert/strict'
import { test } from 'node:test'

import { validarDelDia } from '../src/validators/social.validator.js'

// La recomendación del día usa el día LOCAL de la persona (lo calcula el
// navegador). El servidor corre en UTC: debe aceptar la fecha local de cualquier
// zona horaria (UTC−12 a UTC+14), que puede diferir un día de la fecha UTC.

const contenido = { tmdbId: 301, tipo: 'movie', titulo: 'Risas garantizadas' }

function fechaEnZona(zona, instante) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instante)
  const valor = (tipo) => partes.find((p) => p.type === tipo).value
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

test('acepta la fecha local de Guatemala cuando en UTC ya es el día siguiente', () => {
  // 20:10 del 8 de noviembre en Guatemala = 02:10 del 9 de noviembre en UTC (el caso de GitHub Actions).
  const ahora = new Date('2026-11-09T02:10:00Z')
  assert.equal(fechaEnZona('America/Guatemala', ahora), '2026-11-08')
  assert.deepEqual(validarDelDia({ ...contenido, fecha: '2026-11-08' }, ahora).datos?.fecha, '2026-11-08')
})

test('acepta el día local en las zonas extremas en cualquier momento del día UTC', () => {
  const zonas = ['America/Guatemala', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Etc/GMT+12', 'UTC', 'Asia/Tokyo']
  for (let hora = 0; hora < 24; hora++) {
    const ahora = new Date(Date.UTC(2026, 10, 9, hora, 30))
    for (const zona of zonas) {
      const fecha = fechaEnZona(zona, ahora)
      const { datos, error } = validarDelDia({ ...contenido, fecha }, ahora)
      assert.equal(error, undefined, `${zona} a las ${hora}:30 UTC (${fecha})`)
      assert.equal(datos.fecha, fecha)
    }
  }
})

test('rechaza fechas que no pueden ser «hoy» en ninguna zona horaria o con formato inválido', () => {
  const ahora = new Date('2026-11-09T02:10:00Z')
  for (const fecha of ['2026-11-12', '2026-11-05', '2020-01-01', '2026-13-01', '09-11-2026', '', undefined]) {
    assert.ok(validarDelDia({ ...contenido, fecha }, ahora).error, String(fecha))
  }
})
