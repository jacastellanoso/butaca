import { randomUUID } from 'node:crypto'

import { fechaEnZona } from './support/fechas.js'
import { botonUsuario, entrarComo, expect, test } from './support/pruebas.js'
import { USUARIO_PRUEBA } from './support/sesion.js'

test.use({ conSesion: true })

const campana = (page) => page.getByRole('button', { name: /^Notificaciones/ })
const panel = (page) => page.getByRole('region', { name: 'Centro de notificaciones' })
const delDia = (backend) => backend.social.notificaciones.filter((n) => n.tipo === 'recomendacion-del-dia')

/**
 * Días válidos para la recomendación del día: la fecha local del NAVEGADOR
 * (fixture `timezoneId`), no la del proceso de Node. En GitHub Actions Node usa
 * UTC y, entre las 18:00 y las 24:00 de Guatemala, UTC ya está en el día
 * siguiente. Si la medianoche cae durante la prueba, vale el día de antes o el
 * de después.
 */
function diasPosibles(zona, antes) {
  return [...new Set([fechaEnZona(zona, antes), fechaEnZona(zona)])]
}

test('la campana indica pendientes, incluye la recomendación del día y permite marcarlas como leídas', async ({ page, backend, timezoneId }) => {
  backend.social.invitarAlUsuario({ desde: 'leo', grupo: 'Club de cine' })
  const antes = new Date()
  await entrarComo(page)

  // Invitación + recomendación del día generada para el perfil activo.
  await expect(campana(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')
  await expect(campana(page)).toContainText('2')
  const [registro] = backend.peticionesA('POST', '/api/notificaciones/del-dia')
  expect(registro.body).toMatchObject({ tipo: 'movie' })
  // La fecha es el día local de la persona (zona del navegador), no el de UTC.
  expect(diasPosibles(timezoneId, antes)).toContain(registro.body.fecha)
  expect(registro.body.fecha).toBe(await page.evaluate(() => new Date().toLocaleDateString('en-CA')))
  expect(registro.perfil).toBe(backend.perfilPrincipal.id)

  await campana(page).click()
  await expect(panel(page).getByText('Tu recomendación del día')).toBeVisible()
  await expect(panel(page).getByText('Te invitaron a un grupo')).toBeVisible()

  await panel(page).getByRole('button', { name: 'Marcar todas como leídas' }).click()
  await expect(campana(page)).toHaveAccessibleName('Notificaciones')

  // Persisten en el servidor: al recargar siguen leídas y no se duplica la del día.
  await page.reload()
  await expect(campana(page)).toHaveAccessibleName('Notificaciones')
  expect(delDia(backend)).toHaveLength(1)
  expect(backend.social.notificaciones.every((n) => n.leida)).toBe(true)
})

test('marcar una notificación como leída descuenta el indicador', async ({ page, backend }) => {
  const { grupo } = backend.social.invitarAlUsuario({ desde: 'leo', grupo: 'Club de cine' })
  backend.social.miembros.push({ grupoId: grupo.id, usuarioId: USUARIO_PRUEBA.id, rol: 'miembro', creadoEn: new Date().toISOString() })
  backend.social.invitaciones[0].estado = 'aceptada'
  backend.social.notificaciones[0].leida = true
  backend.social.compartirComo('leo', grupo.id, { tmdbId: 101, tipo: 'movie', titulo: 'La gran butaca' })
  await entrarComo(page)
  await expect(campana(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')

  await campana(page).click()
  await panel(page).getByRole('button', { name: 'Marcar como leída: Leo Ruiz te recomendó algo' }).click()
  await expect(campana(page)).toHaveAccessibleName('Notificaciones, 1 sin leer')
  expect(backend.social.notificaciones.find((n) => n.tipo === 'recomendacion-compartida').leida).toBe(true)

  // El enlace lleva al grupo donde se compartió.
  await panel(page).getByRole('link', { name: 'Abrir grupo' }).click()
  await expect(page).toHaveURL(new RegExp(`/grupos/${grupo.id}$`))
})

test('la recomendación del día pertenece al perfil activo', async ({ page, backend }) => {
  const lucia = {
    id: randomUUID(), propietarioId: USUARIO_PRUEBA.id, nombre: 'Lucía', apellido: 'Prueba', edad: 12,
    avatar: null, esPrincipal: false, creadoEn: new Date().toISOString(),
  }
  backend.social.perfiles.push(lucia)
  await entrarComo(page)
  await expect.poll(() => delDia(backend).length).toBe(1)

  await botonUsuario(page).click()
  await page.getByRole('group', { name: 'Cambiar de perfil' }).getByRole('button', { name: 'Lucía Prueba' }).click()
  await expect.poll(() => delDia(backend).length).toBe(2)
  expect(delDia(backend).map((n) => n.perfilId).sort()).toEqual([backend.perfilPrincipal.id, lucia.id].sort())

  // Lucía solo ve la suya.
  await campana(page).click()
  await expect(panel(page).getByText('Tu recomendación del día')).toHaveCount(1)
})

// La recomendación del día sigue el día local en cualquier zona horaria, también
// en los extremos (UTC+14 y UTC−11), donde la fecha local suele diferir de UTC.
for (const zona of ['America/Guatemala', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
  test.describe(`zona horaria ${zona}`, () => {
    test.use({ timezoneId: zona })

    test('la recomendación del día usa la fecha local del navegador y no se duplica al recargar', async ({ page, backend, timezoneId }) => {
      expect(timezoneId).toBe(zona)
      const antes = new Date()
      await entrarComo(page)
      await expect(campana(page)).toHaveAccessibleName(/sin leer/)
      // El navegador realmente está en esa zona horaria.
      expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(zona)
      const [registro] = backend.peticionesA('POST', '/api/notificaciones/del-dia')
      expect(diasPosibles(zona, antes)).toContain(registro.body.fecha)
      // Coincide con el calendario que ve la persona en su dispositivo.
      expect(registro.body.fecha).toBe(await page.evaluate(() => new Date().toLocaleDateString('en-CA')))

      // Mismo día local: al recargar no se pide otra recomendación del día.
      await page.reload()
      await expect(campana(page)).toBeVisible()
      await expect.poll(() => delDia(backend).length).toBe(1)
      expect(backend.peticionesA('POST', '/api/notificaciones/del-dia')).toHaveLength(1)
    })
  })
}
