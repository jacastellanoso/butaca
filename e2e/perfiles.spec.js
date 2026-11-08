import { randomUUID } from 'node:crypto'

import { botonUsuario, entrarComo, expect, menu, test } from './support/pruebas.js'
import { USUARIO_PRUEBA } from './support/sesion.js'

test.use({ conSesion: true })

/** Un segundo perfil de la misma cuenta, guardado en el backend falso. */
function agregarPerfil(backend, { nombre = 'Lucía', apellido = 'Prueba', edad = 12 } = {}) {
  const perfil = {
    id: randomUUID(), propietarioId: USUARIO_PRUEBA.id, nombre, apellido, edad,
    avatar: null, esPrincipal: false, creadoEn: new Date().toISOString(),
  }
  backend.social.perfiles.push(perfil)
  return perfil
}

async function cambiarDesdeMenu(page, nombre) {
  await botonUsuario(page).click()
  await page.getByRole('group', { name: 'Cambiar de perfil' }).getByRole('button', { name: nombre }).click()
  await expect(botonUsuario(page)).toContainText(nombre)
}

test('crear un perfil con nombre, apellido y edad y entrar con él', async ({ page, backend }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/#perfiles$/)

  await page.getByRole('button', { name: 'Agregar perfil' }).click()
  const formulario = page.getByRole('dialog', { name: 'Nuevo perfil' })
  await formulario.getByLabel('Nombre').fill('Lucía')
  await formulario.getByLabel('Apellido').fill('Prueba')
  await formulario.getByLabel('Edad').fill('12')
  await formulario.getByRole('button', { name: 'Crear perfil' }).click()

  const tarjeta = page.getByRole('button', { name: 'Entrar como Lucía Prueba' })
  await expect(tarjeta).toContainText('12 años')
  expect(backend.peticionesA('POST', '/api/perfiles').at(-1).body).toEqual({ nombre: 'Lucía', apellido: 'Prueba', edad: 12 })
  const lucia = backend.social.perfiles.find((p) => p.nombre === 'Lucía')

  await tarjeta.click()
  await expect(page).toHaveURL(/#galeria$/)
  // El menú de usuario muestra el perfil elegido y las peticiones viajan con su id.
  await expect(botonUsuario(page)).toContainText('Lucía Prueba')
  await expect.poll(() => backend.peticionesA('GET', '/api/favoritos').at(-1)?.perfil).toBe(lucia.id)
})

test('el formulario de perfil valida nombre, apellido y edad', async ({ page, backend }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Agregar perfil' }).click()
  const formulario = page.getByRole('dialog', { name: 'Nuevo perfil' })
  await formulario.getByLabel('Nombre').fill('Lucía')
  await formulario.getByLabel('Apellido').fill('Prueba')
  await formulario.getByLabel('Edad').fill('200')
  await formulario.getByRole('button', { name: 'Crear perfil' }).click()

  await expect(formulario.getByRole('alert')).toHaveText('Ingresá una edad válida entre 5 y 120 años.')
  expect(backend.peticionesA('POST', '/api/perfiles')).toHaveLength(0)
})

test('cambiar de perfil desde el menú actualiza el perfil activo y se mantiene al navegar y recargar', async ({ page, backend }) => {
  const lucia = agregarPerfil(backend)
  await entrarComo(page)
  await expect(botonUsuario(page)).toContainText('Majo Prueba')

  await cambiarDesdeMenu(page, 'Lucía Prueba')

  await menu(page, 'Dashboard').click()
  await expect(page.getByRole('heading', { name: /Hola, Lucía/ })).toBeVisible()
  await expect(botonUsuario(page)).toContainText('Lucía Prueba')
  await expect.poll(() => backend.peticionesA('GET', '/api/animos').at(-1)?.perfil).toBe(lucia.id)

  await page.reload()
  await expect(botonUsuario(page)).toContainText('Lucía Prueba')
  await expect(page.getByRole('heading', { name: /Hola, Lucía/ })).toBeVisible()
})

test('favoritos e historial emocional no se mezclan entre perfiles de la misma cuenta', async ({ page, backend }) => {
  agregarPerfil(backend)
  await entrarComo(page)

  // Majo guarda un favorito.
  await page.getByRole('button', { name: 'Ver detalles de La gran butaca' }).click()
  const detalle = page.getByRole('dialog', { name: 'La gran butaca' })
  await detalle.getByRole('button', { name: 'Agregar a favoritos' }).click()
  await expect(detalle.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible()
  await detalle.getByRole('button', { name: 'Cerrar detalle' }).click()
  expect(backend.favoritos[0].perfilId).toBe(backend.perfilPrincipal.id)

  // Lucía no lo ve.
  await cambiarDesdeMenu(page, 'Lucía Prueba')
  await menu(page, 'Favoritos').click()
  await expect(page.getByText('Todavía no tenés favoritos')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'La gran butaca' })).toHaveCount(0)

  // De vuelta en Majo, el favorito sigue ahí.
  await cambiarDesdeMenu(page, 'Majo Prueba')
  await expect(page.getByRole('heading', { name: 'Mis favoritos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'La gran butaca' })).toBeVisible()
})

test('administrar perfiles: editar y eliminar uno secundario; el principal no se elimina', async ({ page, backend }) => {
  const lucia = agregarPerfil(backend)
  page.on('dialog', (dialogo) => dialogo.accept())
  await page.goto('/#perfiles')

  await page.getByRole('button', { name: 'Administrar perfiles' }).click()
  await expect(page.getByRole('button', { name: 'Eliminar Majo Prueba' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Editar Lucía Prueba' }).click()
  const formulario = page.getByRole('dialog', { name: 'Editar a Lucía Prueba' })
  await formulario.getByLabel('Edad').fill('13')
  await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('button', { name: 'Entrar como Lucía Prueba' })).toContainText('13 años')
  expect(lucia.edad).toBe(13)

  await page.getByRole('button', { name: 'Eliminar Lucía Prueba' }).click()
  await expect(page.getByRole('button', { name: 'Entrar como Lucía Prueba' })).toHaveCount(0)
  expect(backend.social.perfiles.some((p) => p.id === lucia.id)).toBe(false)
})

test('cuenta de Melanie: crear Sofía y Carlos, entrar como Sofía y volver a Melanie cambia toda la aplicación', async ({ page, backend }) => {
  // La cuenta que inició sesión es Melanie Hernández (perfil principal).
  Object.assign(backend.usuario, { nombre: 'Melanie', apellido: 'Hernández' })
  Object.assign(backend.perfilPrincipal, { nombre: 'Melanie', apellido: 'Hernández' })
  const melanie = backend.perfilPrincipal
  const favorito = (perfilId, titulo, tmdbId) => ({
    id: randomUUID(), tmdbId, tipo: 'movie', titulo, poster: null, creadoEn: new Date().toISOString(), perfilId,
  })
  backend.favoritos.push(favorito(melanie.id, 'Favorito de Melanie', 9001))

  // Crear dos perfiles desde «¿Quién va a ver hoy?».
  await page.goto('/')
  for (const [nombre, apellido, edad] of [['Sofía', 'Hernández', '10'], ['Carlos', 'Hernández', '40']]) {
    await page.getByRole('button', { name: 'Agregar perfil' }).click()
    const formulario = page.getByRole('dialog', { name: 'Nuevo perfil' })
    await formulario.getByLabel('Nombre').fill(nombre)
    await formulario.getByLabel('Apellido').fill(apellido)
    await formulario.getByLabel('Edad').fill(edad)
    await formulario.getByRole('button', { name: 'Crear perfil' }).click()
    await expect(page.getByRole('button', { name: `Entrar como ${nombre} ${apellido}` })).toBeVisible()
  }
  const sofia = backend.social.perfiles.find((p) => p.nombre === 'Sofía')
  backend.favoritos.push(favorito(sofia.id, 'Favorito de Sofía', 9002))

  /** Toda la aplicación corresponde al perfil indicado, no solo el texto del encabezado. */
  async function comprobarPerfil(perfil, otro) {
    const nombre = `${perfil.nombre} ${perfil.apellido}`
    // Encabezado.
    await expect(botonUsuario(page)).toContainText(nombre)
    await expect(botonUsuario(page)).not.toContainText(`${otro.nombre} ${otro.apellido}`)
    // Menú: perfil activo y, aparte, la cuenta que inició sesión.
    await botonUsuario(page).click()
    await expect(page.getByTestId('perfil-activo')).toHaveText(nombre)
    await expect(page.getByTestId('cuenta-sesion')).toContainText('Cuenta: Melanie Hernández')
    // El avatar del menú es el del perfil activo y su inicial se ve (blanca sobre azul).
    const avatar = page.locator('.app-header__menu-profile .avatar-perfil')
    await expect(avatar).toHaveText(perfil.nombre[0])
    expect(await avatar.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)')
    await page.keyboard.press('Escape')
    // Galería: las peticiones viajan con el id real del perfil.
    await menu(page, 'Galería').click()
    await expect.poll(() => backend.peticionesA('GET', '/api/favoritos').at(-1)?.perfil).toBe(perfil.id)
    // Favoritos propios, nunca los del otro perfil.
    await menu(page, 'Favoritos').click()
    await expect(page.getByRole('heading', { name: `Favorito de ${perfil.nombre}` })).toBeVisible()
    await expect(page.getByRole('heading', { name: `Favorito de ${otro.nombre}` })).toHaveCount(0)
    // Dashboard y emociones del perfil.
    await menu(page, 'Dashboard').click()
    await expect(page.getByRole('heading', { name: new RegExp(`Hola, ${perfil.nombre}`) })).toBeVisible()
    await expect.poll(() => backend.peticionesA('GET', '/api/animos').at(-1)?.perfil).toBe(perfil.id)
    // Recargar mantiene el perfil elegido (no vuelve al principal).
    const desde = backend.peticiones.length
    await page.reload()
    await expect(botonUsuario(page)).toContainText(nombre)
    await expect(page.getByRole('heading', { name: new RegExp(`Hola, ${perfil.nombre}`) })).toBeVisible()
    // Ninguna petición con datos personales salió con el perfil equivocado tras recargar.
    await menu(page, 'Favoritos').click()
    await expect(page.getByRole('heading', { name: `Favorito de ${perfil.nombre}` })).toBeVisible()
    const personales = backend.peticiones.slice(desde).filter((p) => /^\/api\/(favoritos|historial|animos)/.test(p.ruta))
    expect(personales.length).toBeGreaterThan(0)
    for (const p of personales) expect(p.perfil).toBe(perfil.id)
  }

  // Elegir Sofía en la pantalla de perfiles.
  await page.getByRole('button', { name: 'Entrar como Sofía Hernández' }).click()
  await expect(page).toHaveURL(/#galeria$/)
  await comprobarPerfil(sofia, melanie)

  // Volver a Melanie desde el menú de usuario.
  await cambiarDesdeMenu(page, 'Melanie Hernández')
  await comprobarPerfil(melanie, sofia)

  // Y de nuevo a Sofía, desde «Administrar perfiles».
  await botonUsuario(page).click()
  await page.getByRole('link', { name: 'Administrar perfiles' }).click()
  await page.getByRole('button', { name: 'Entrar como Sofía Hernández' }).click()
  await comprobarPerfil(sofia, melanie)
})
