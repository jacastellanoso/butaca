import { randomUUID } from 'node:crypto'

import { botonUsuario, entrarComo, expect, menu, test } from './support/pruebas.js'
import { USUARIO_PRUEBA } from './support/sesion.js'

// Rutas reales sin #, páginas legales, logo blanco en Perfiles, imágenes no
// arrastrables y diseño de notificaciones.

const sinHash = (page) => expect.poll(() => new URL(page.url()).hash).toBe('')

function agregarPerfil(backend, nombre = 'Lucía') {
  const perfil = {
    id: randomUUID(), propietarioId: USUARIO_PRUEBA.id, nombre, apellido: 'Prueba', edad: 12,
    avatar: null, esPrincipal: false, creadoEn: new Date().toISOString(),
  }
  backend.social.perfiles.push(perfil)
  return perfil
}

test.describe('con sesión', () => {
  test.use({ conSesion: true })

  test('el menú navega por rutas sin #, y Atrás y Adelante funcionan conservando el perfil', async ({ page, backend }) => {
    const lucia = agregarPerfil(backend)
    await entrarComo(page, 'Lucía Prueba')
    await expect(page).toHaveURL(/\/galeria$/)

    for (const [enlace, ruta] of [['Grupos', '/grupos'], ['Dashboard', '/dashboard'], ['Favoritos', '/favoritos'], ['Mis recomendaciones', '/recomendaciones'], ['Escanearme', '/rostro']]) {
      await menu(page, enlace).click()
      await expect(page).toHaveURL(new RegExp(`${ruta}$`))
      await sinHash(page)
    }
    // Navegar no recarga la página: el documento sigue siendo el mismo.
    await page.evaluate(() => { window.__mismoDocumento = true })

    await page.goBack()
    await expect(page).toHaveURL(/\/recomendaciones$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/favoritos$/)
    await expect(page.getByRole('heading', { name: 'Mis favoritos' })).toBeVisible()
    await page.goForward()
    await expect(page).toHaveURL(/\/recomendaciones$/)
    expect(await page.evaluate(() => window.__mismoDocumento)).toBe(true)

    // El perfil activo se mantiene en toda la navegación.
    await expect(botonUsuario(page)).toContainText('Lucía Prueba')
    expect(backend.peticiones.filter((p) => p.ruta.startsWith('/api/favoritos')).every((p) => p.perfil === lucia.id)).toBe(true)
  })

  test('entrar directo o recargar cualquier ruta interna abre esa pantalla', async ({ page, backend }) => {
    const lucia = agregarPerfil(backend)
    await entrarComo(page, 'Lucía Prueba')
    const casos = [
      ['/grupos', page.getByRole('heading', { name: 'Mis grupos' })],
      ['/dashboard', page.getByRole('heading', { name: /Hola, Lucía/ })],
      ['/favoritos', page.getByRole('heading', { name: 'Mis favoritos' })],
      ['/historial', page.getByRole('heading', { name: /Historial/ }).first()],
      ['/recomendaciones/emocion/happy', page.getByRole('heading', { name: /Hola, Lucía/ })],
      ['/galeria', page.getByRole('heading', { name: 'Galería principal de Butaca' })],
      ['/perfiles', page.getByRole('heading', { name: /Quién va a ver hoy/ })],
    ]
    for (const [ruta, visible] of casos) {
      await page.goto(ruta)
      await expect(visible).toBeVisible()
      await page.reload()
      await expect(page).toHaveURL(new RegExp(`${ruta}$`))
      await expect(visible).toBeVisible()
    }
    // Tras recargar, el perfil elegido sigue activo.
    await page.goto('/galeria')
    await expect(botonUsuario(page)).toContainText('Lucía Prueba')
    expect(backend.peticionesA('GET', '/api/favoritos').at(-1).perfil).toBe(lucia.id)
  })

  test('los enlaces antiguos con # llevan a su pantalla con la ruta nueva', async ({ page }) => {
    const grupoId = randomUUID()
    for (const [antiguo, nueva, visible] of [
      ['/#grupos', '/grupos', page.getByRole('heading', { name: 'Mis grupos' })],
      ['/#favoritos', '/favoritos', page.getByRole('heading', { name: 'Mis favoritos' })],
      ['/#recomendaciones/emocion/sad', '/recomendaciones/emocion/sad', page.getByRole('heading', { name: /Hola, Majo/ })],
      [`/#grupos/${grupoId}`, `/grupos/${grupoId}`, page.getByText('No pudimos abrir el grupo')],
      ['/#perfiles', '/perfiles', page.getByRole('heading', { name: /Quién va a ver hoy/ })],
    ]) {
      await page.goto(antiguo)
      await expect(page).toHaveURL(new RegExp(`${nueva}$`))
      await sinHash(page)
      await expect(visible).toBeVisible()
    }
  })

  test('el logo es blanco solo en Perfiles y azul en el resto', async ({ page }) => {
    await page.goto('/perfiles')
    const logoPerfiles = page.locator('.perfiles-logo')
    await expect(logoPerfiles).toHaveAttribute('src', /logobutacablanco/)
    const svg = await (await page.request.get(await logoPerfiles.getAttribute('src'))).text()
    expect(svg.match(/fill:rgb\(255,255,255\)/g)).toHaveLength(6)
    expect(svg).not.toContain('fill:rgb(4,112,246)')

    await page.getByRole('button', { name: 'Entrar como Majo Prueba' }).click()
    await expect(page.locator('.app-header__brand img')).toHaveAttribute('src', /logobutacaoficial/)
    // El pie es azul oscuro: usa la misma variante blanca (antes se lograba con un filtro CSS).
    await expect(page.locator('.site-footer__logo')).toHaveAttribute('src', /logobutacablanco/)
  })

  test('las imágenes de la interfaz no se pueden arrastrar', async ({ page }) => {
    await entrarComo(page)
    await page.getByRole('button', { name: 'Ver detalles de La gran butaca' }).waitFor()
    const imagenes = await page.locator('img').evaluateAll((lista) => lista.map((img) => ({
      draggable: img.draggable,
      arrastre: getComputedStyle(img).webkitUserDrag,
      seleccion: getComputedStyle(img).userSelect,
    })))
    expect(imagenes.length).toBeGreaterThan(2)
    for (const img of imagenes) {
      expect(img).toEqual({ draggable: false, arrastre: 'none', seleccion: 'none' })
    }
    // El logo del encabezado tampoco arrastra su enlace.
    await expect(page.locator('.app-header__brand')).toHaveAttribute('draggable', 'false')
    // Un arrastre real con el mouse no inicia ninguna operación de arrastre.
    const iniciados = await page.evaluate(() => {
      window.__arrastres = 0
      document.addEventListener('dragstart', () => { window.__arrastres += 1 })
      return window.__arrastres
    })
    const logo = await page.locator('.app-header__brand img').boundingBox()
    await page.mouse.move(logo.x + 20, logo.y + 10)
    await page.mouse.down()
    await page.mouse.move(logo.x + 220, logo.y + 200, { steps: 8 })
    await page.mouse.up()
    expect(await page.evaluate(() => window.__arrastres)).toBe(iniciados)
    // El texto normal se sigue pudiendo seleccionar.
    expect(await page.locator('.site-footer__tagline').evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none')
  })

  test('notificaciones: tarjetas separadas, no leídas destacadas y botón «Marcar como leída» circular', async ({ page, backend }) => {
    backend.social.invitarAlUsuario({ desde: 'leo', grupo: 'Club de cine' })
    const leida = backend.social.notificar(USUARIO_PRUEBA.id, 'invitacion-aceptada', 'Invitación aceptada', 'Leo se unió a «Club».')
    leida.leida = true
    await entrarComo(page)
    await page.getByRole('button', { name: /^Notificaciones/ }).click()
    const panel = page.getByRole('region', { name: 'Centro de notificaciones' })
    const tarjetas = panel.locator('.notificacion')
    await expect(tarjetas).toHaveCount(3)

    const estilos = await tarjetas.evaluateAll((lista) => lista.map((el) => {
      const s = getComputedStyle(el)
      return { nueva: el.classList.contains('notificacion--nueva'), radio: parseFloat(s.borderTopLeftRadius), sombra: s.boxShadow, borde: s.borderTopWidth, fondo: s.backgroundImage + s.backgroundColor }
    }))
    for (const e of estilos) {
      expect(e.radio).toBeGreaterThanOrEqual(12)
      expect(e.sombra).not.toBe('none')
      expect(e.borde).not.toBe('0px')
    }
    // Las no leídas se ven distintas de las leídas.
    const nueva = estilos.find((e) => e.nueva)
    const vieja = estilos.find((e) => !e.nueva)
    expect(nueva.fondo).not.toBe(vieja.fondo)
    await expect(panel.locator('.notificacion--nueva .notificacion__nueva').first()).toHaveText('Nueva')

    // Cada tarjeta muestra título, descripción y fecha, separadas entre sí.
    const cajas = await tarjetas.evaluateAll((lista) => lista.map((el) => el.getBoundingClientRect().toJSON()))
    for (let i = 1; i < cajas.length; i++) expect(cajas[i].top).toBeGreaterThanOrEqual(cajas[i - 1].bottom + 6)
    for (const el of await tarjetas.all()) {
      await expect(el.locator('.notificacion__titulo')).toBeVisible()
      await expect(el.locator('p').first()).toBeVisible()
      await expect(el.locator('time')).toBeVisible()
    }

    // Botón circular, azul y blanco, accesible y sin pisar el texto.
    const boton = panel.getByRole('button', { name: /^Marcar como leída: / }).first()
    await expect(boton).toHaveAttribute('title', 'Marcar como leída')
    const forma = await boton.evaluate((el) => {
      const s = getComputedStyle(el)
      return { ancho: el.offsetWidth, alto: el.offsetHeight, radio: s.borderRadius, color: s.color, fondo: s.backgroundColor }
    })
    expect(forma.ancho).toBeGreaterThanOrEqual(40)
    expect(forma.alto).toBe(forma.ancho)
    expect(forma.radio).toBe('50%')
    expect(forma.color).toBe('rgb(4, 112, 246)')
    expect(forma.fondo).toBe('rgb(255, 255, 255)')
    await boton.hover()
    await expect.poll(() => boton.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(4, 112, 246)')
    const tarjeta = boton.locator('xpath=ancestor::li[1]')
    const cajaBoton = await boton.boundingBox()
    const cajaTexto = await tarjeta.locator('.notificacion__cuerpo').boundingBox()
    expect(cajaBoton.x).toBeGreaterThanOrEqual(cajaTexto.x + cajaTexto.width)

    // La lógica sigue igual: marcar como leída descuenta el indicador.
    const antes = await page.getByRole('button', { name: /^Notificaciones/ }).getAttribute('aria-label')
    await boton.click()
    await expect(page.getByRole('button', { name: /^Notificaciones/ })).not.toHaveAttribute('aria-label', antes)
  })
})

test.describe('barras de desplazamiento', () => {
  test.use({ conSesion: true })

  test('el panel de notificaciones se desplaza solo, con barra delgada y sin barras dobles', async ({ page, backend }) => {
    for (let i = 1; i <= 14; i++) {
      backend.social.notificar(USUARIO_PRUEBA.id, 'invitacion-aceptada', `Aviso ${i}`, `Persona ${i} se unió a «Cine».`)
    }
    await entrarComo(page)
    // Un único contenedor con scroll vertical: el documento no se desplaza.
    const barras = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).overflowY,
      body: getComputedStyle(document.body).overflowY,
      galeria: getComputedStyle(document.querySelector('.gallery-page')).overflowY,
      ancho: getComputedStyle(document.querySelector('.gallery-page')).scrollbarWidth,
    }))
    expect(barras.body).toBe('hidden')
    expect(barras.galeria).toBe('auto')
    expect(barras.ancho).toBe('thin')

    await page.getByRole('button', { name: /^Notificaciones/ }).click()
    const lista = page.locator('.notificaciones__lista')
    const estado = await lista.evaluate((el) => ({
      desplazable: el.scrollHeight > el.clientHeight,
      overflow: getComputedStyle(el).overflowY,
      gutter: getComputedStyle(el).scrollbarGutter,
      ancho: getComputedStyle(el).scrollbarWidth,
    }))
    expect(estado).toEqual({ desplazable: true, overflow: 'auto', gutter: 'stable', ancho: 'thin' })

    // Desplazar el panel con la rueda no mueve la galería de fondo.
    const antes = await page.locator('.gallery-page').evaluate((el) => el.scrollTop)
    const caja = await lista.boundingBox()
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
    await page.mouse.wheel(0, 2000)
    await expect.poll(() => lista.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    expect(await page.locator('.gallery-page').evaluate((el) => el.scrollTop)).toBe(antes)
    // La última notificación se alcanza completa (la barra no la tapa).
    await expect(lista.locator('.notificacion').last()).toBeInViewport({ ratio: 1 })
  })
})

test.describe('sin sesión', () => {
  test('Privacidad y Términos se abren sin iniciar sesión, por URL y desde la pantalla de acceso', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Información legal' }).getByRole('link', { name: 'Privacidad' }).click()
    await expect(page).toHaveURL(/\/privacidad$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible()
    for (const seccion of ['Quién es responsable', 'Qué datos recopilamos', 'Edad y perfiles de menores', 'Cámara y análisis de expresiones', 'Google, GitHub y otros servicios', 'Cómo solicitar la eliminación de tus datos', 'Contacto']) {
      await expect(page.getByRole('heading', { name: new RegExp(seccion) }).first()).toBeVisible()
    }
    // Textos completos para un proyecto académico: sin marcas provisionales públicas.
    const privacidad = await page.locator('.legal-card').innerText()
    expect(privacidad).not.toMatch(/pendiente|borrador/i)
    expect(privacidad).toContain('proyecto académico')
    expect(privacidad).toContain('18 años o más')
    expect(privacidad).toMatch(/no identifica a las personas/)
    expect(privacidad).toMatch(/no un diagnóstico/)
    // El contacto es el repositorio público real; no se inventan correos.
    await expect(page.getByRole('link', { name: 'repositorio público del proyecto en GitHub' }).first())
      .toHaveAttribute('href', 'https://github.com/jacastellanoso/butaca')
    expect(privacidad).not.toMatch(/@[a-z0-9-]+\.[a-z]/i)

    await page.getByRole('link', { name: 'Términos y condiciones' }).last().click()
    await expect(page).toHaveURL(/\/terminos$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible()
    for (const seccion of ['Registro y uso de cuentas', 'Grupos e invitaciones', 'Propiedad intelectual', 'Limitación de responsabilidad']) {
      await expect(page.getByRole('heading', { name: new RegExp(seccion) })).toBeVisible()
    }
    const terminos = await page.locator('.legal-card').innerText()
    expect(terminos).not.toMatch(/pendiente|borrador/i)
    expect(terminos).toContain('18 años o más')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible()

    // El índice salta a la sección sin cambiar de página.
    await page.getByRole('navigation', { name: 'Contenido' }).getByRole('link', { name: 'Propiedad intelectual' }).click()
    await expect(page.getByRole('heading', { name: /Propiedad intelectual/ })).toBeInViewport()
    await expect(page).toHaveURL(/\/terminos#propiedad$/)
  })

  test('en celular las páginas legales se leen completas y sin desplazamiento horizontal', async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true })
    const page = await contexto.newPage()
    await page.goto('/privacidad')
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    const contacto = page.getByRole('heading', { name: /^\d+\. Contacto$/ })
    await contacto.scrollIntoViewIfNeeded()
    await expect(contacto).toBeInViewport()
    await contexto.close()
  })
})

test.describe('pie de página con sesión', () => {
  test.use({ conSesion: true })

  test('los enlaces legales del pie abren sus páginas', async ({ page }) => {
    await entrarComo(page)
    const pie = page.getByRole('list', { name: 'Información legal' })
    await pie.getByRole('link', { name: 'Privacidad' }).click()
    await expect(page).toHaveURL(/\/privacidad$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/\/galeria$/)
    await page.getByRole('list', { name: 'Información legal' }).getByRole('link', { name: 'Términos y condiciones' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible()
  })
})
