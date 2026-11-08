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

  test('una cuenta registrada entra directamente al reconocimiento facial', async ({ page, backend }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/#rostro$/)
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
    // Al validar la sesión se sincroniza el usuario con auth-service.
    await expect.poll(() => backend.peticionesA('POST', '/api/usuarios').length).toBeGreaterThan(0)
  })

  test('una cuenta nueva guarda nombre y apellido antes del reconocimiento', async ({ page, backend }) => {
    backend.usuario.nombre = null
    backend.usuario.apellido = null
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Queremos conocerte' })).toBeVisible()
    await page.getByLabel('Nombre').fill('Ana')
    await page.getByLabel('Apellido').fill('García')
    await page.getByRole('button', { name: 'Continuar al reconocimiento facial' }).click()

    await expect(page).toHaveURL(/#rostro$/)
    await expect.poll(() => backend.peticionesA('PUT', '/api/usuarios').at(-1)?.body)
      .toEqual({ nombre: 'Ana', apellido: 'García' })
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
