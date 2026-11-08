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
const tarjetas = (page) => page.getByRole('region', { name: 'Películas y series' }).getByRole('button', { name: /Ver detalles de/ })

async function nombresDeTarjetas(page) {
  return tarjetas(page).evaluateAll((botones) => botones.map((b) => b.getAttribute('aria-label')))
}

test('«Cargar más» agrega la página siguiente sin perder ni repetir títulos hasta el final', async ({ page, backend }) => {
  backend.catalogoPaginado({ paginas: 3, porPagina: 6 })
  // Respuesta lenta para ver el indicador de carga.
  await page.route('**/api/catalogo?*pagina=2*', async (route) => {
    await new Promise((r) => setTimeout(r, 400))
    await route.fallback()
  })
  await entrarComo(page)

  await expect(tarjetas(page)).toHaveCount(6)
  const pagina1 = await nombresDeTarjetas(page)
  const cargarMas = page.getByRole('button', { name: 'Cargar más' })
  await cargarMas.click()
  await expect(page.getByRole('button', { name: 'Cargando más títulos…' })).toBeDisabled()
  // La página 2 trae 7 títulos y uno repite la página 1: solo se agregan los 6 nuevos.
  await expect(tarjetas(page)).toHaveCount(12)
  const tras2 = await nombresDeTarjetas(page)
  expect(tras2.slice(0, 6)).toEqual(pagina1)
  expect(new Set(tras2).size).toBe(tras2.length)
  expect(backend.peticiones.filter((p) => p.ruta === '/api/catalogo').map((p) => new URLSearchParams(p.query).get('pagina')))
    .toEqual([null, '2'])

  // Se pide solo una página por clic, nunca todo el catálogo.
  for (let i = 3; i <= 12; i++) {
    if (!(await cargarMas.isVisible())) break
    await cargarMas.click()
    await expect(page.getByRole('button', { name: /Cargando más títulos/ })).toHaveCount(0)
  }
  await expect(cargarMas).toHaveCount(0)
  await expect(page.getByText('Ya viste todos los títulos disponibles.')).toBeVisible()
  const finales = await nombresDeTarjetas(page)
  expect(new Set(finales).size).toBe(finales.length)
  expect(finales.length).toBe(4 * 18) // 4 géneros × 18 títulos, sin duplicados
})

test('«Cargar más» respeta la categoría elegida y conserva lo cargado al volver a «Todos»', async ({ page, backend }) => {
  backend.catalogoPaginado({ paginas: 2, porPagina: 6 })
  await entrarComo(page)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(tarjetas(page)).toHaveCount(12)

  await page.getByRole('button', { name: 'Terror', exact: true }).click()
  await expect(tarjetas(page)).toHaveCount(6)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(tarjetas(page)).toHaveCount(12)
  for (const nombre of await nombresDeTarjetas(page)) expect(nombre).toMatch(/Ver detalles de Terror \d+/)
  await expect(page.getByText('Ya viste todos los títulos de Terror.')).toBeVisible()
  const pedidosTerror = backend.peticiones
    .filter((p) => p.ruta === '/api/catalogo' && new URLSearchParams(p.query).get('categoria') === 'Terror')
    .map((p) => new URLSearchParams(p.query).get('pagina') ?? '1')
  expect(pedidosTerror).toEqual(['1', '2'])

  // Volver a «Todos» no recarga ni pierde las 12 tarjetas ya obtenidas.
  const antes = backend.peticiones.length
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await expect(tarjetas(page)).toHaveCount(12)
  expect(backend.peticiones.slice(antes).filter((p) => p.ruta === '/api/catalogo')).toHaveLength(0)
})

test('si falla «Cargar más» se conservan los títulos y se puede reintentar', async ({ page, backend }) => {
  backend.catalogoPaginado({ paginas: 3, porPagina: 6 })
  await entrarComo(page)
  await expect(tarjetas(page)).toHaveCount(6)
  backend.fallarVeces('/api/catalogo', 502, 1)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(page.getByRole('alert')).toHaveText('No pudimos cargar más títulos. Intentá de nuevo.')
  await expect(tarjetas(page)).toHaveCount(6)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(tarjetas(page)).toHaveCount(12)
})

test.describe('en un celular', () => {
  test.use({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true })

  test('«Cargar más» es visible al final de la galería y agrega títulos', async ({ page, backend }) => {
    backend.catalogoPaginado({ paginas: 2, porPagina: 6 })
    await entrarComo(page)
    const cargarMas = page.getByRole('button', { name: 'Cargar más' })
    await cargarMas.scrollIntoViewIfNeeded()
    await expect(cargarMas).toBeInViewport({ ratio: 1 })
    const caja = await cargarMas.boundingBox()
    expect(caja.height).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await cargarMas.tap()
    await expect(tarjetas(page)).toHaveCount(12)
  })
})
