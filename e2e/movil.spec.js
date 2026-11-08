import { expect, test } from './support/pruebas.js'

// Pantallas pequeñas con Chromium emulando un celular táctil. Se usan los
// tamaños de iPhone sin cambiar de navegador (WebKit no está en CI).
const TELEFONOS = [
  { nombre: 'Android pequeño', width: 360, height: 640 },
  { nombre: 'iPhone SE (2.ª gen.)', width: 375, height: 667 },
  { nombre: 'iPhone SE (1.ª gen.)', width: 320, height: 568 },
  { nombre: 'iPhone 14 Pro', width: 393, height: 852 },
  { nombre: 'Android Pixel 7', width: 412, height: 915 },
  { nombre: 'Android Galaxy S20', width: 360, height: 800 },
]

// iOS Safari (y Chrome Android sin resizes-content) no achica la ventana al
// abrir el teclado: lo superpone y solo se reduce visualViewport. Chromium no
// lo emula, así que se sustituye visualViewport por uno controlable.
async function simularTecladoSuperpuesto(page) {
  await page.addInitScript(() => {
    const viewport = new EventTarget()
    let alto = null
    Object.defineProperties(viewport, {
      height: { get: () => alto ?? window.innerHeight },
      width: { get: () => window.innerWidth },
      offsetTop: { get: () => 0 },
    })
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => viewport })
    window.__teclado = (fraccion) => {
      alto = fraccion ? Math.round(window.innerHeight * (1 - fraccion)) : null
      viewport.dispatchEvent(new Event('resize'))
    }
  })
}

test.use({ conSesion: true, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })

// Deslizamiento con el dedo: secuencia touchStart → touchMove → touchEnd por
// CDP, la misma entrada que produce un celular. Si algún contenedor bloquea el
// scroll, la página no se mueve (así se reprodujo el error de producción:
// scrollY 0 y el botón cortado en 360 × 640). distanciaY < 0 desliza hacia
// arriba (el contenido baja).
async function deslizar(page, distanciaY) {
  const cdp = await page.context().newCDPSession(page)
  const { width, height } = page.viewportSize()
  const x = Math.round(width / 2)
  const inicio = distanciaY < 0 ? Math.round(height * 0.8) : Math.round(height * 0.2)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: inicio }] })
  for (let paso = 1; paso <= 12; paso++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: inicio + (distanciaY * paso) / 12 }] })
    await page.waitForTimeout(16)
  }
  // El dedo se detiene antes de levantarse: sin inercia residual. Un toque
  // durante la inercia (o el rebote al llegar al final) solo la frena y no
  // presiona el botón, igual que en un celular.
  for (let pausa = 0; pausa < 6; pausa++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: inicio + distanciaY }] })
    await page.waitForTimeout(25)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await page.waitForTimeout(300)
}

/** Toque con el dedo en el centro del elemento (misma vía CDP que deslizar). */
async function tocar(page, locator) {
  const caja = await locator.boundingBox()
  const punto = { x: Math.round(caja.x + caja.width / 2), y: Math.round(caja.y + caja.height / 2) }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [punto] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

async function esVisibleCompleto(locator) {
  const caja = await locator.boundingBox()
  const { height } = locator.page().viewportSize()
  return Boolean(caja) && caja.y >= 0 && caja.y + caja.height <= height
}

const sinScrollHorizontal = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

for (const telefono of TELEFONOS) {
  test.describe(telefono.nombre, () => {
    test.use({ viewport: { width: telefono.width, height: telefono.height } })

    test('"Queremos conocerte" se ve completo, se desplaza y se puede enviar', async ({ page, backend }) => {
      backend.usuario.nombre = null
      backend.usuario.apellido = null
      backend.usuario.edad = null
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Queremos conocerte' })).toBeVisible()
      expect(await sinScrollHorizontal(page)).toBe(true)

      for (const campo of ['Nombre', 'Apellido', 'Edad']) {
        const entrada = page.getByLabel(campo)
        await entrada.scrollIntoViewIfNeeded()
        await expect(entrada).toBeInViewport()
      }

      // Con el teclado abierto el área visible se achica: el contenedor permite
      // desplazarse y el campo enfocado y el botón siguen alcanzables.
      await page.setViewportSize({ width: telefono.width, height: Math.round(telefono.height * 0.55) })
      expect(await page.evaluate(() => document.scrollingElement.scrollHeight > window.innerHeight)).toBe(true)

      await page.getByLabel('Nombre').fill('Ana')
      await page.getByLabel('Apellido').fill('García')
      const edad = page.getByLabel('Edad')
      await edad.focus()
      await expect(edad).toBeInViewport()
      await edad.fill('31')

      const continuar = page.getByRole('button', { name: 'Continuar al reconocimiento facial' })
      await continuar.scrollIntoViewIfNeeded()
      await expect(continuar).toBeInViewport()
      await continuar.tap()

      await expect(page).toHaveURL(/\/perfiles$/)
      expect(backend.peticionesA('PUT', '/api/usuarios').at(-1).body).toEqual({ nombre: 'Ana', apellido: 'García', edad: 31 })
    })

    test('"Queremos conocerte" se desliza con el dedo hasta Continuar y de vuelta al título, sin teclado', async ({ page, backend }) => {
      backend.usuario.nombre = null
      backend.usuario.apellido = null
      backend.usuario.edad = null
      await page.goto('/')
      const titulo = page.getByRole('heading', { name: 'Queremos conocerte' })
      const continuar = page.getByRole('button', { name: 'Continuar al reconocimiento facial' })
      await expect(titulo).toBeVisible()

      // Ningún elemento padre bloquea el scroll: el documento es más alto que la pantalla y desplazable.
      const estado = await page.evaluate(() => ({
        alto: document.scrollingElement.scrollHeight, ventana: window.innerHeight,
        overflow: ['html', 'body', '#root'].map((sel) => getComputedStyle(document.querySelector(sel)).overflowY),
      }))
      if (estado.alto > estado.ventana) expect(estado.overflow).not.toContain('hidden')
      // En 360 × 640 y 375 × 667 el botón empieza cortado: la prueba exige desplazarse de verdad.
      if (telefono.height <= 667) await expect(continuar).not.toBeInViewport({ ratio: 1 })

      // Deslizar hacia arriba con el dedo (el contenido baja) hasta ver el botón completo.
      for (let i = 0; i < 4 && !(await continuar.isVisible() && await esVisibleCompleto(continuar)); i++) {
        await deslizar(page, -300)
      }
      await expect(continuar).toBeInViewport({ ratio: 1 })
      // Queda espacio libre debajo del botón para presionarlo cómodamente.
      const caja = await continuar.boundingBox()
      expect(page.viewportSize().height - (caja.y + caja.height)).toBeGreaterThanOrEqual(16)

      // Y deslizar en sentido contrario vuelve al título.
      for (let i = 0; i < 4; i++) await deslizar(page, 300)
      await expect(titulo).toBeInViewport({ ratio: 1 })
      expect(await page.evaluate(() => window.scrollY)).toBe(0)

      // Se completa el formulario y se presiona el botón tras volver a deslizar.
      await page.getByLabel('Nombre').fill('Ana')
      await page.getByLabel('Apellido').fill('García')
      await page.getByLabel('Edad').fill('31')
      await page.getByLabel('Edad').blur()
      for (let i = 0; i < 4; i++) await deslizar(page, -300)
      await expect(continuar).toBeInViewport({ ratio: 1 })
      await tocar(page, continuar)
      await expect(page).toHaveURL(/\/perfiles$/)
      expect(backend.peticionesA('PUT', '/api/usuarios').at(-1).body).toEqual({ nombre: 'Ana', apellido: 'García', edad: 31 })
      // Al salir del formulario se restaura el bloqueo de scroll del resto de la app.
      expect(await page.evaluate(() => document.documentElement.classList.contains('pagina-desplazable'))).toBe(false)
    })

    test('"Queremos conocerte" con el teclado superpuesto: se baja hasta Continuar y se vuelve a subir', async ({ page, backend }) => {
      backend.usuario.nombre = null
      backend.usuario.apellido = null
      backend.usuario.edad = null
      await simularTecladoSuperpuesto(page)
      await page.goto('/')
      const titulo = page.getByRole('heading', { name: 'Queremos conocerte' })
      await expect(titulo).toBeVisible()
      const contenedor = page.locator('.registro-nombre')

      // Teclado abierto: tapa el 45 % inferior sin cambiar el tamaño de la ventana.
      await page.getByLabel('Nombre').tap()
      await page.evaluate(() => window.__teclado(0.45))
      await expect.poll(() => contenedor.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)))
        .toBeGreaterThan(telefono.height * 0.4)
      await page.getByLabel('Nombre').fill('Ana')
      await page.getByLabel('Apellido').fill('García')

      // Desplazándose hasta el final, Edad y Continuar quedan por encima del teclado.
      await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight))
      const visible = Math.round(telefono.height * 0.55)
      for (const elemento of [page.getByLabel('Edad'), page.getByRole('button', { name: 'Continuar al reconocimiento facial' })]) {
        const caja = await elemento.boundingBox()
        expect(caja.y).toBeGreaterThanOrEqual(0)
        expect(caja.y + caja.height).toBeLessThanOrEqual(visible)
      }
      await page.getByLabel('Edad').fill('31')

      // Y se puede volver a subir hasta el encabezado.
      await page.evaluate(() => window.scrollTo(0, 0))
      await expect(titulo).toBeInViewport()

      // Teclado cerrado: desaparece el espacio extra y el formulario se envía.
      await page.evaluate(() => window.__teclado(0))
      await expect.poll(() => contenedor.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)))
        .toBeLessThan(80)
      const continuar = page.getByRole('button', { name: 'Continuar al reconocimiento facial' })
      await continuar.scrollIntoViewIfNeeded()
      await expect(continuar).toBeInViewport({ ratio: 1 })
      await continuar.tap()
      await expect(page).toHaveURL(/\/perfiles$/)
      expect(backend.peticionesA('PUT', '/api/usuarios').at(-1).body).toEqual({ nombre: 'Ana', apellido: 'García', edad: 31 })
    })

    test('perfiles, encabezado y notificaciones funcionan en pantalla pequeña', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Agregar perfil' }).tap()
      const formulario = page.getByRole('dialog', { name: 'Nuevo perfil' })
      const crear = formulario.getByRole('button', { name: 'Crear perfil' })
      await crear.scrollIntoViewIfNeeded()
      await expect(crear).toBeInViewport()
      await formulario.getByRole('button', { name: 'Cancelar' }).tap()

      await page.getByRole('button', { name: 'Entrar como Majo Prueba' }).tap()
      await expect(page).toHaveURL(/\/galeria$/)
      expect(await sinScrollHorizontal(page)).toBe(true)

      const campana = page.getByRole('button', { name: /^Notificaciones/ })
      await expect(campana).toBeInViewport()
      await campana.tap()
      const panel = page.getByRole('region', { name: 'Centro de notificaciones' })
      await expect(panel).toBeInViewport()

      await page.getByRole('button', { name: 'Abrir menú' }).tap()
      await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Grupos' })).toBeVisible()
    })
  })
}
