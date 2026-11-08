import { randomUUID } from 'node:crypto'

import { botonUsuario, entrarComo, expect, test } from './support/pruebas.js'
import { USUARIO_PRUEBA } from './support/sesion.js'

test.use({ conSesion: true })

const recomendacionesGet = (backend) => backend.peticionesA('GET', '/api/recomendaciones')
  .filter((p) => !p.query.includes('emocion=neutral')) // la recomendación del día también consulta

test('Mis recomendaciones se recupera sola si el servicio responde 502 mientras despierta', async ({ page, backend }) => {
  await entrarComo(page)
  backend.fallarVeces('/api/recomendaciones', 502, 1)
  await page.goto('/recomendaciones/emocion/happy')

  await expect(page.getByRole('heading', { name: 'Risas garantizadas' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('No pudimos obtener tus recomendaciones')).toHaveCount(0)
  expect(recomendacionesGet(backend).length).toBeGreaterThanOrEqual(2)
})

test('si el servicio sigue sin responder, se muestra el error con reintento', async ({ page, backend }) => {
  await entrarComo(page)
  backend.fallar('/api/recomendaciones', 503)
  await page.goto('/recomendaciones/emocion/happy')

  const alerta = page.getByRole('alert').filter({ hasText: 'No pudimos obtener tus recomendaciones' })
  await expect(alerta).toBeVisible({ timeout: 30_000 })
  await expect(alerta).toContainText('El servicio no está disponible en este momento.')

  // Cuando el servicio vuelve, Reintentar carga las recomendaciones.
  delete backend.fallas['/api/recomendaciones']
  await alerta.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('heading', { name: 'Risas garantizadas' })).toBeVisible()
})

test('Mis recomendaciones usa el último ánimo del perfil activo', async ({ page, backend }) => {
  const lucia = { id: randomUUID(), propietarioId: USUARIO_PRUEBA.id, nombre: 'Lucía', apellido: 'Prueba', edad: 12, avatar: null, esPrincipal: false, creadoEn: new Date().toISOString() }
  backend.social.perfiles.push(lucia)
  const animo = {
    id: randomUUID(), perfilId: backend.perfilPrincipal.id, emocion: 'sad', confianza: 0.9, origen: 'deteccion',
    consentimientoHistorial: true, consentimientoVersion: 'historial-v1', consentimientoEn: new Date().toISOString(), creadoEn: new Date().toISOString(),
  }
  backend.animos.push(animo)
  await entrarComo(page)
  await page.goto('/recomendaciones')

  await expect(page.getByText('Tu ánimo: Tristeza')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Risas garantizadas' })).toBeVisible()
  const consulta = recomendacionesGet(backend).at(-1)
  expect(consulta.query).toContain(`animoId=${animo.id}`)
  expect(consulta.perfil).toBe(backend.perfilPrincipal.id)

  // Lucía no tiene ánimos guardados: no ve el de Majo.
  await botonUsuario(page).click()
  await page.getByRole('group', { name: 'Cambiar de perfil' }).getByRole('button', { name: 'Lucía Prueba' }).click()
  await expect(page.getByText('Todavía no sabemos cómo te sentís')).toBeVisible()
})
