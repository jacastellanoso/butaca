import { randomUUID } from 'node:crypto'

import { botonUsuario, entrarComo, expect, test } from './support/pruebas.js'
import { USUARIO_PRUEBA } from './support/sesion.js'

test.use({ conSesion: true })

const campana = (page) => page.getByRole('button', { name: /^Notificaciones/ })
const panel = (page) => page.getByRole('region', { name: 'Centro de notificaciones' })
const delDia = (backend) => backend.social.notificaciones.filter((n) => n.tipo === 'recomendacion-del-dia')

function hoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('la campana indica pendientes, incluye la recomendación del día y permite marcarlas como leídas', async ({ page, backend }) => {
  backend.social.invitarAlUsuario({ desde: 'leo', grupo: 'Club de cine' })
  await entrarComo(page)

  // Invitación + recomendación del día generada para el perfil activo.
  await expect(campana(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')
  await expect(campana(page)).toContainText('2')
  const [registro] = backend.peticionesA('POST', '/api/notificaciones/del-dia')
  expect(registro.body).toMatchObject({ fecha: hoyLocal(), tipo: 'movie' })
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
