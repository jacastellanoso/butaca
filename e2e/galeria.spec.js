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

test('con el catálogo dormido en Render muestra «Estamos preparando tus películas…» y carga solo', async ({ page, backend }) => {
  // Render responde 502 mientras despierta el servicio (medido en producción).
  backend.fallarVeces('/api/catalogo', 502, 3)
  await entrarComo(page)

  await expect(page.getByText('Estamos preparando tus películas…')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'preparando' })).toHaveAttribute('aria-busy', 'true')
  // Sin presionar nada, las películas aparecen cuando el servicio responde.
  for (const item of CATALOGO) {
    await expect(page.getByRole('button', { name: `Ver detalles de ${item.titulo}` })).toBeVisible({ timeout: 20_000 })
  }
  await expect(page.getByText('Estamos preparando tus películas…')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0)
  expect(backend.peticionesA('GET', '/api/catalogo')).toHaveLength(4)
})

test('un error permanente del catálogo se muestra enseguida, sin pantalla de espera', async ({ page, backend }) => {
  backend.fallar('/api/catalogo', 500)
  await entrarComo(page)

  await expect(page.getByRole('alert')).toContainText('No pudimos cargar la galería')
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  await expect(page.getByText('Estamos preparando tus películas…')).toHaveCount(0)
  expect(backend.peticionesA('GET', '/api/catalogo')).toHaveLength(1)
})

test('si el catálogo nunca despierta, tras los reintentos se muestra el error y «Reintentar» funciona', async ({ page, backend }) => {
  await page.clock.install()
  backend.fallar('/api/catalogo', 502)
  await entrarComo(page)
  await expect(page.getByText('Estamos preparando tus películas…')).toBeVisible()

  // Se adelanta el reloj ~75 s: los reintentos terminan (no son infinitos).
  for (let i = 0; i < 15; i++) {
    await page.clock.runFor(5_000)
    if (await page.getByRole('alert').isVisible()) break
  }
  await expect(page.getByRole('alert')).toContainText('El catálogo no respondió después de varios intentos')
  const pedidos = backend.peticionesA('GET', '/api/catalogo').length
  expect(pedidos).toBe(9)

  // Ya sin reintentos automáticos: el usuario puede volver a intentar cuando quiera.
  delete backend.fallas['/api/catalogo']
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('button', { name: `Ver detalles de ${CATALOGO[0].titulo}` })).toBeVisible()
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
  await expect(page.getByText('No hay más resultados para estos filtros.')).toBeVisible()
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

test('el buscador encuentra títulos por nombre aunque todavía no estén cargados y respeta «Cargar más»', async ({ page, backend }) => {
  backend.catalogoPaginado({ paginas: 3, porPagina: 6 })
  await entrarComo(page)
  await expect(tarjetas(page)).toHaveCount(6)
  // «Terror 17» no está en la primera página de «Todos».
  await expect(page.getByRole('button', { name: 'Ver detalles de Terror 17' })).toHaveCount(0)

  const buscador = page.getByRole('searchbox', { name: 'Buscar películas y series por nombre' })
  await buscador.fill('terror 1')
  await buscador.press('Enter')
  await expect(page.getByText(/Resultados para «terror 1»/)).toBeVisible()
  // Terror 1 y Terror 10 a 18: 10 resultados en dos páginas de 6.
  await expect(tarjetas(page)).toHaveCount(6)
  for (const nombre of await nombresDeTarjetas(page)) expect(nombre).toMatch(/Terror 1\d?$/)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(tarjetas(page)).toHaveCount(10)
  await expect(page.getByRole('button', { name: 'Ver detalles de Terror 17' })).toBeVisible()
  expect(backend.peticiones.filter((p) => p.ruta === '/api/catalogo').map((p) => new URLSearchParams(p.query).get('busqueda')))
    .toContain('terror 1')

  // Sin coincidencias: mensaje claro y opción de quitar filtros.
  await buscador.fill('zzz inexistente')
  await buscador.press('Enter')
  await expect(page.getByText('No encontramos resultados para «zzz inexistente»')).toBeVisible()
  await page.getByRole('button', { name: 'Quitar filtros' }).last().click()
  await expect(buscador).toHaveValue('')
  await expect(tarjetas(page)).toHaveCount(6)
})

test('el filtro por emoción muestra títulos relacionados, se combina con categorías y no usa el escaneo', async ({ page, backend }) => {
  backend.catalogoPaginado({ paginas: 2, porPagina: 6 })
  await entrarComo(page)
  const emociones = page.getByRole('group', { name: 'Explorar por emoción' })
  for (const nombre of ['Calma', 'Alegría', 'Tristeza', 'Enojo', 'Miedo', 'Desagrado', 'Sorpresa']) {
    await expect(emociones.getByRole('button', { name: nombre })).toBeVisible()
  }

  await emociones.getByRole('button', { name: 'Miedo' }).click()
  await expect(emociones.getByRole('button', { name: 'Miedo' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/relacionados con miedo/)).toBeVisible()
  await expect(tarjetas(page)).toHaveCount(6)
  for (const nombre of await nombresDeTarjetas(page)) expect(nombre).toMatch(/Terror \d+$/)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(tarjetas(page)).toHaveCount(12)
  const pedidos = backend.peticiones.filter((p) => p.ruta === '/api/catalogo').map((p) => new URLSearchParams(p.query))
  expect(pedidos.filter((q) => q.get('emocion') === 'fearful').map((q) => q.get('pagina') ?? '1')).toEqual(['1', '2'])

  // Combinado con una categoría sin relación (Comedia + Miedo): sin resultados.
  await page.getByRole('button', { name: 'Comedia', exact: true }).click()
  await expect(page.getByText('No hay contenidos para estos filtros')).toBeVisible()
  // Volver a tocar la emoción la quita y vuelve la categoría sola.
  await emociones.getByRole('button', { name: 'Miedo' }).click()
  await expect(tarjetas(page)).toHaveCount(6)
  for (const nombre of await nombresDeTarjetas(page)) expect(nombre).toMatch(/Comedia \d+$/)

  // El filtro es independiente del reconocimiento facial: no pide recomendaciones
  // de escaneo para esa emoción ni registra emociones. (La campana sí pide su
  // «recomendación del día», que no depende del filtro.)
  expect(backend.peticiones.filter((p) => p.ruta === '/api/recomendaciones' && p.query.includes('fearful'))).toHaveLength(0)
  expect(backend.peticionesA('POST', '/api/animos')).toHaveLength(0)
})
