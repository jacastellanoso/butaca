import { entrarComo, expect, menu, test } from './support/pruebas.js'
import { USUARIO_PRUEBA } from './support/sesion.js'

test.use({ conSesion: true })

const campana = (page) => page.getByRole('button', { name: /^Notificaciones/ })

/** Leo creó "Club de cine" e invitó a Majo; si `aceptada`, Majo ya es integrante. */
function grupoDeLeo(backend, { aceptada = false } = {}) {
  const { grupo, invitacion } = backend.social.invitarAlUsuario({ desde: 'leo', grupo: 'Club de cine' })
  if (aceptada) {
    invitacion.estado = 'aceptada'
    backend.social.miembros.push({ grupoId: grupo.id, usuarioId: USUARIO_PRUEBA.id, rol: 'miembro', creadoEn: new Date().toISOString() })
    for (const n of backend.social.notificaciones) n.leida = true
  }
  return grupo
}

test('crear un grupo, invitar por correo y recibir el aviso cuando la otra persona acepta', async ({ page, backend }) => {
  await entrarComo(page)
  await menu(page, 'Grupos').click()
  await expect(page).toHaveURL(/\/grupos$/)

  await page.getByLabel('Nuevo grupo').fill('Cine de los viernes')
  await page.getByRole('button', { name: 'Crear grupo' }).click()
  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Cine de los viernes' })).toBeVisible()

  await page.getByLabel('Invitar por correo electrónico').fill('leo@butaca.test')
  await page.getByRole('button', { name: 'Invitar', exact: true }).click()
  await expect(page.getByText('Invitación enviada a leo@butaca.test.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancelar invitación a leo@butaca.test' })).toBeVisible()
  const invitacion = backend.peticiones.find((p) => p.metodo === 'POST' && p.ruta.endsWith('/invitaciones'))
  expect(invitacion.body).toEqual({ email: 'leo@butaca.test' })

  // Leo acepta desde su cuenta: Majo recibe la notificación y Leo aparece en el grupo.
  backend.social.responderComo('leo', true)
  await campana(page).click()
  const panel = page.getByRole('region', { name: 'Centro de notificaciones' })
  await expect(panel.getByText('Leo Ruiz se unió a «Cine de los viernes».')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Leo Ruiz', { exact: true })).toBeVisible()
  await expect(page.getByText('Majo Prueba (vos)')).toBeVisible()
})

test('invitar con un correo inválido o a quien ya integra el grupo muestra el motivo', async ({ page, backend }) => {
  const grupo = grupoDeLeo(backend, { aceptada: true })
  await entrarComo(page)
  await page.goto(`/grupos/${grupo.id}`)

  await page.getByLabel('Invitar por correo electrónico').fill('leo@butaca.test')
  await page.getByRole('button', { name: 'Invitar', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Esa persona ya forma parte del grupo.')
})

test('aceptar una invitación desde la campana agrega al grupo y abre el grupo', async ({ page, backend }) => {
  const grupo = grupoDeLeo(backend)
  await entrarComo(page)

  await expect(campana(page)).toHaveAccessibleName(/sin leer/)
  await campana(page).click()
  const panel = page.getByRole('region', { name: 'Centro de notificaciones' })
  await expect(panel.getByText('Leo Ruiz te invitó a «Club de cine».')).toBeVisible()
  await panel.getByRole('button', { name: 'Aceptar' }).click()

  await expect(page).toHaveURL(new RegExp(`/grupos/${grupo.id}$`))
  await expect(page.getByRole('heading', { name: 'Club de cine' })).toBeVisible()
  await expect(page.getByText('Majo Prueba (vos)')).toBeVisible()
  expect(backend.social.miembros.some((m) => m.grupoId === grupo.id && m.usuarioId === USUARIO_PRUEBA.id)).toBe(true)
  expect(backend.social.invitaciones[0].estado).toBe('aceptada')
})

test('rechazar una invitación no agrega al grupo', async ({ page, backend }) => {
  const grupo = grupoDeLeo(backend)
  await entrarComo(page)
  await campana(page).click()
  const panel = page.getByRole('region', { name: 'Centro de notificaciones' })
  await panel.getByRole('button', { name: 'Rechazar' }).click()

  await expect(panel.getByText('Invitación rechazada')).toBeVisible()
  expect(backend.social.miembros.some((m) => m.grupoId === grupo.id && m.usuarioId === USUARIO_PRUEBA.id)).toBe(false)
})

test('compartir desde el detalle de una película y ver quién compartió cada recomendación', async ({ page, backend }) => {
  const grupo = grupoDeLeo(backend, { aceptada: true })
  await entrarComo(page)

  await page.getByRole('button', { name: 'Ver detalles de La gran butaca' }).click()
  const detalle = page.getByRole('dialog', { name: 'La gran butaca' })
  await detalle.getByRole('button', { name: 'Compartir con un grupo' }).click()
  await expect(detalle.getByLabel('Grupo')).toHaveValue(grupo.id)
  await detalle.getByLabel('Mensaje (opcional)').fill('¡Imperdible!')
  await detalle.getByRole('button', { name: 'Enviar recomendación' }).click()
  await expect(detalle.getByText('Recomendación compartida.')).toBeVisible()

  const [post] = backend.peticiones.filter((p) => p.metodo === 'POST' && p.ruta === `/api/grupos/${grupo.id}/recomendaciones`)
  expect(post.body).toEqual({ tmdbId: 101, tipo: 'movie', titulo: 'La gran butaca', poster: null, mensaje: '¡Imperdible!' })
  expect(post.perfil).toBe(backend.perfilPrincipal.id)
  await detalle.getByRole('button', { name: 'Cerrar detalle' }).click()

  // Leo comparte una serie en el mismo grupo.
  backend.social.compartirComo('leo', grupo.id, { tmdbId: 201, tipo: 'tv', titulo: 'Serie del ánimo', mensaje: 'Para el finde' })

  await page.goto(`/grupos/${grupo.id}`)
  const recomendaciones = page.getByRole('region', { name: 'Recomendaciones compartidas' })
  await expect(recomendaciones.getByRole('article').filter({ hasText: 'Serie del ánimo' })).toContainText('Compartida por Leo Ruiz')
  await expect(recomendaciones.getByRole('article').filter({ hasText: 'La gran butaca' })).toContainText('Compartida por Majo Prueba (vos)')
})

test('compartir un favorito con un integrante específico desde la página del grupo', async ({ page, backend }) => {
  const grupo = grupoDeLeo(backend, { aceptada: true })
  backend.favoritos.push({
    id: crypto.randomUUID(), perfilId: backend.perfilPrincipal.id, tmdbId: 102, tipo: 'movie',
    titulo: 'Noche de terror', poster: null, creadoEn: new Date().toISOString(),
  })
  await entrarComo(page)
  await page.goto(`/grupos/${grupo.id}`)

  await page.getByLabel('Película o serie').selectOption({ label: 'Noche de terror (Película)' })
  await page.getByLabel('Para').selectOption({ label: 'Leo Ruiz' })
  await page.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(page.getByText('Compartiste «Noche de terror».')).toBeVisible()

  const tarjeta = page.getByRole('article').filter({ hasText: 'Noche de terror' })
  await expect(tarjeta).toContainText('para Leo Ruiz')
  expect(backend.social.recomendaciones[0].destinatarioId).toBe('22222222-2222-4222-8222-222222222222')
})

test('quien creó el grupo puede quitar integrantes y eliminar el grupo', async ({ page, backend }) => {
  page.on('dialog', (dialogo) => dialogo.accept())
  await entrarComo(page)
  await menu(page, 'Grupos').click()
  await page.getByLabel('Nuevo grupo').fill('Terror en casa')
  await page.getByRole('button', { name: 'Crear grupo' }).click()
  await page.getByLabel('Invitar por correo electrónico').fill('sofi@butaca.test')
  await page.getByRole('button', { name: 'Invitar', exact: true }).click()
  await expect(page.getByText('Invitación enviada a sofi@butaca.test.')).toBeVisible()
  backend.social.responderComo('sofi', true)
  await page.reload()

  await page.getByRole('button', { name: 'Quitar a Sofi Paz' }).click()
  await expect(page.getByRole('button', { name: 'Quitar a Sofi Paz' })).toHaveCount(0)
  expect(backend.social.miembros.filter((m) => m.usuarioId === '33333333-3333-4333-8333-333333333333')).toHaveLength(0)

  await page.getByRole('button', { name: 'Eliminar grupo' }).click()
  await expect(page).toHaveURL(/\/grupos$/)
  await expect(page.getByText('Todavía no formás parte de ningún grupo.', { exact: false })).toBeVisible()
  expect(backend.social.grupos).toHaveLength(0)
})

test('la página Grupos lista las invitaciones recibidas y permite aceptarlas aunque el aviso ya no esté en la campana', async ({ page, backend }) => {
  const grupo = grupoDeLeo(backend)
  // El aviso se perdió entre notificaciones viejas: la campana ya no lo muestra.
  backend.social.notificaciones.length = 0
  await entrarComo(page)
  await menu(page, 'Grupos').click()

  const invitaciones = page.getByRole('region', { name: 'Invitaciones recibidas' })
  await expect(invitaciones.getByText(/Leo Ruiz\s*te invitó a\s*«Club de cine»/)).toBeVisible()
  await invitaciones.getByRole('button', { name: 'Aceptar invitación a Club de cine' }).click()

  await expect(page).toHaveURL(new RegExp(`/grupos/${grupo.id}$`))
  await expect(page.getByRole('heading', { name: 'Club de cine' })).toBeVisible()
  await expect(page.getByText('Majo Prueba (vos)')).toBeVisible()
  await expect(invitaciones).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Club de cine/ })).toBeVisible()
  expect(backend.social.invitaciones[0].estado).toBe('aceptada')
})

test('rechazar desde la página Grupos quita la invitación y no agrega al grupo', async ({ page, backend }) => {
  const grupo = grupoDeLeo(backend)
  await entrarComo(page)
  await menu(page, 'Grupos').click()

  const invitaciones = page.getByRole('region', { name: 'Invitaciones recibidas' })
  await invitaciones.getByRole('button', { name: 'Rechazar invitación a Club de cine' }).click()

  await expect(invitaciones).toHaveCount(0)
  await expect(page).toHaveURL(/\/grupos$/)
  expect(backend.social.invitaciones[0].estado).toBe('rechazada')
  expect(backend.social.miembros.some((m) => m.grupoId === grupo.id && m.usuarioId === USUARIO_PRUEBA.id)).toBe(false)
  // La campana deja de ofrecer Aceptar para esa invitación.
  await campana(page).click()
  const panel = page.getByRole('region', { name: 'Centro de notificaciones' })
  await expect(panel.getByRole('button', { name: 'Aceptar' })).toHaveCount(0)
})
