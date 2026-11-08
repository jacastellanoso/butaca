import { estadoConSesion } from './support/sesion.js'
import { entrarComo, expect, test } from './support/pruebas.js'

test.describe('Sin sesión', () => {
  test('muestra la bienvenida con los accesos de Google y GitHub', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /GitHub/ })).toBeVisible()
  })

  test('las pantallas con datos personales no se abren escribiendo la URL', async ({ page, backend }) => {
    for (const hash of ['#dashboard', '#favoritos', '#rostro', '#galeria']) {
      await page.goto(`/${hash}`)
      await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
      await expect(page.getByRole('heading', { name: /Mis emociones|Mis favoritos/ })).toHaveCount(0)
    }
    // Nada personal se pidió al gateway sin sesión.
    expect(backend.peticiones.filter((p) => p.ruta !== '/api/catalogo')).toEqual([])
  })
})

test.describe('Con sesión', () => {
  test.use({ conSesion: true })

  // Flujo vigente: inicio de sesión → "¿Quién va a ver hoy?" → galería.
  test('una cuenta registrada elige perfil y luego entra a la galería', async ({ page, backend }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/#perfiles$/)
    await expect(page.getByRole('heading', { name: /Quién va a ver hoy/ })).toBeVisible()
    // Al validar la sesión se sincroniza el usuario con auth-service.
    await expect.poll(() => backend.peticionesA('POST', '/api/usuarios').length).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Entrar como Majo Prueba' }).click()
    await expect(page).toHaveURL(/#galeria$/)
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  })

  test('una cuenta nueva guarda nombre, apellido y edad antes de elegir perfil', async ({ page, backend }) => {
    backend.usuario.nombre = null
    backend.usuario.apellido = null
    backend.usuario.edad = null
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Queremos conocerte' })).toBeVisible()
    await page.getByLabel('Nombre').fill('Ana')
    await page.getByLabel('Apellido').fill('García')
    await page.getByLabel('Edad').fill('31')
    await page.getByRole('button', { name: 'Continuar al reconocimiento facial' }).click()

    await expect(page).toHaveURL(/#perfiles$/)
    await expect.poll(() => backend.peticionesA('PUT', '/api/usuarios').at(-1)?.body)
      .toEqual({ nombre: 'Ana', apellido: 'García', edad: 31 })
    // El perfil principal muestra los datos recién guardados.
    await expect(page.getByRole('button', { name: 'Entrar como Ana García' })).toContainText('31 años')
  })

  test('el registro valida la edad antes de enviar', async ({ page, backend }) => {
    backend.usuario.edad = null
    await page.goto('/')

    await page.getByLabel('Nombre').fill('Ana')
    await page.getByLabel('Apellido').fill('García')
    await page.getByLabel('Edad').fill('3')
    await page.getByRole('button', { name: 'Continuar al reconocimiento facial' }).click()

    await expect(page.getByRole('alert')).toHaveText('Ingresá una edad válida entre 5 y 120 años.')
    expect(backend.peticionesA('PUT', '/api/usuarios')).toHaveLength(0)
  })

  test('una cuenta existente entra aunque los servicios de Render estén despertando', async ({ page, backend }) => {
    // Gateway y auth-service dormidos: los primeros intentos responden 502 y 503.
    backend.fallarVeces('/api/usuarios', 502, 2)
    await page.goto('/')

    await expect(page.getByText(/despertando los servicios/)).toBeVisible()
    await expect(page).toHaveURL(/#perfiles$/, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Entrar como Majo Prueba' })).toBeVisible()
    await expect(page.getByText(/no pudimos preparar tu cuenta/)).toHaveCount(0)
    expect(backend.peticionesA('POST', '/api/usuarios').length).toBeGreaterThanOrEqual(3)
  })

  test('ingresar, salir y volver a ingresar recupera la misma cuenta, perfiles y favoritos', async ({ page, backend, baseURL }) => {
    await entrarComo(page)
    const perfilesAntes = backend.social.perfiles.length
    const favoritosAntes = structuredClone(backend.favoritos)

    for (let ingreso = 0; ingreso < 3; ingreso++) {
      await page.getByRole('button', { name: /Majo Prueba/ }).click()
      await page.getByRole('button', { name: 'Cerrar sesión' }).click()
      await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()

      // Volver a ingresar: Supabase deja otra vez la sesión de la misma cuenta.
      const { name, value } = estadoConSesion(baseURL).origins[0].localStorage[0]
      await page.evaluate(([clave, valor]) => localStorage.setItem(clave, valor), [name, value])
      await page.goto('/')
      await expect(page).toHaveURL(/#perfiles$/)
      await expect(page.getByText(/no pudimos preparar tu cuenta/)).toHaveCount(0)
      await page.getByRole('button', { name: 'Entrar como Majo Prueba' }).click()
      await expect(page).toHaveURL(/#galeria$/)

      // Recargar con la sesión activa mantiene la cuenta sin pasar por el registro.
      await page.reload()
      await expect(page).toHaveURL(/#galeria$/)
      await expect(page.getByRole('heading', { name: 'Queremos conocerte' })).toHaveCount(0)
    }

    // Cada ingreso sincronizó la cuenta sin duplicarla ni perder datos.
    expect(backend.peticionesA('POST', '/api/usuarios').length).toBeGreaterThanOrEqual(4)
    expect(backend.social.perfiles).toHaveLength(perfilesAntes)
    expect(backend.favoritos).toEqual(favoritosAntes)
  })

  test('Reintentar recupera la cuenta después de un error', async ({ page, backend }) => {
    // Un error no transitorio muestra la pantalla de error de inmediato.
    backend.fallar('/api/usuarios', 400)
    await page.goto('/')
    await expect(page.getByText(/no pudimos preparar tu cuenta/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

    delete backend.fallas['/api/usuarios']
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page).toHaveURL(/#perfiles$/)
    await expect(page.getByRole('button', { name: 'Entrar como Majo Prueba' })).toBeVisible()
  })

  test('cerrar sesión vuelve a la bienvenida y protege el dashboard', async ({ page }) => {
    await entrarComo(page)

    await page.getByRole('button', { name: /Majo Prueba/ }).click()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
    await page.goto('/#dashboard')
    await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
  })
})
