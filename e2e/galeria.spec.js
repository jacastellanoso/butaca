import { CATALOGO } from './support/backendFalso.js'
import { entrarComo, expect, menu, test } from './support/pruebas.js'

test.use({ conSesion: true })

test('la galería muestra el catálogo y filtra por género', async ({ page }) => {
  await entrarComo(page)
  const grilla = page.getByRole('region', { name: 'Películas y series' })

  for (const item of CATALOGO) {
    await expect(grilla.getByRole('button', { name: `Ver detalles de ${item.titulo}` })).toBeVisible()
  }

  await page.getByRole('button', { name: 'Terror', exact: true }).click()
  await expect(grilla.getByRole('button', { name: /Ver detalles de/ })).toHaveCount(1)
  await expect(grilla.getByRole('button', { name: 'Ver detalles de Noche de terror' })).toBeVisible()
})

test('agregar un favorito desde el detalle lo muestra en Mis favoritos', async ({ page, backend }) => {
  await entrarComo(page)

  await page.getByRole('button', { name: 'Ver detalles de La gran butaca' }).click()
  const detalle = page.getByRole('dialog', { name: 'La gran butaca' })
  await expect(detalle).toBeVisible()
  await detalle.getByRole('button', { name: 'Agregar a favoritos' }).click()
  await expect(detalle.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible()

  // El front envía solo los datos del contenido; el usuario sale del token.
  const [post] = backend.peticionesA('POST', '/api/favoritos')
  expect(post.body).toEqual({ tmdbId: 101, tipo: 'movie', titulo: 'La gran butaca', poster: null })
  expect(post.authorization).toMatch(/^Bearer /)

  await detalle.getByRole('button', { name: 'Cerrar detalle' }).click()
  await menu(page, 'Favoritos').click()

  await expect(page.getByRole('heading', { name: 'Mis favoritos' })).toBeVisible()
  await expect(page.getByText('La gran butaca')).toBeVisible()
})

test('si el catálogo no responde se muestra un error con reintento', async ({ page, backend }) => {
  backend.fallar('/api/catalogo', 502)
  await entrarComo(page)

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ver detalles de/ })).toHaveCount(0)
})