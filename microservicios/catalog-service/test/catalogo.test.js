import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// Aislamiento de entorno: no se cargan secretos reales ni se realizan llamadas a internet.
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('../.env.example', import.meta.url))
process.env.SERVICE_NAME = 'catalog-service'
process.env.TMDB_API_KEY = 'tmdb_clave_secreta_de_prueba_no_filtrar'
process.env.TMDB_BASE_URL = 'https://tmdb.invalid/3'
process.env.TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'
process.env.TMDB_TIMEOUT_MS = '2500'

const SECRETO_TMDB = 'tmdb_clave_secreta_de_prueba_no_filtrar'

const { env } = await import('../src/config/env.js')
const { app } = await import('../src/app.js')

// Datos simulados con la estructura oficial de TMDB v3.
const peliculaPeleaTmdb = {
  id: 550,
  media_type: 'movie',
  title: 'El club de la pelea',
  overview: 'Un oficinista insomne y un fabricante de jabón forman un club clandestino.',
  release_date: '1999-10-15',
  genre_ids: [18, 28],
  vote_average: 8.438,
  poster_path: '/pelea.jpg',
  backdrop_path: '/pelea-bg.jpg',
}

const peliculaMatrixTmdb = {
  id: 603,
  media_type: 'movie',
  title: 'Matrix',
  overview: 'Un programador descubre la verdadera naturaleza de su realidad.',
  release_date: '1999-03-31',
  genre_ids: [28, 878],
  vote_average: 8.216,
  poster_path: '/matrix.jpg',
  backdrop_path: '/matrix-bg.jpg',
}

const serieTronosTmdb = {
  id: 1399,
  media_type: 'tv',
  name: 'Juego de tronos',
  overview: 'Nueve familias nobles luchan por el control de las tierras de Poniente.',
  first_air_date: '2011-04-17',
  genre_ids: [18, 10765, 10759],
  vote_average: 8.452,
  poster_path: '/tronos.jpg',
  backdrop_path: '/tronos-bg.jpg',
}

const detallePeliculaTmdb = {
  ...peliculaPeleaTmdb,
  genres: [
    { id: 18, name: 'Drama' },
    { id: 28, name: 'Acción' },
  ],
  runtime: 139,
  status: 'Released',
  original_language: 'en',
}

const detalleSerieTmdb = {
  ...serieTronosTmdb,
  genres: [
    { id: 18, name: 'Drama' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
  ],
  episode_run_time: [55],
  number_of_seasons: 8,
  number_of_episodes: 73,
  status: 'Ended',
  original_language: 'en',
}

function respuestaJsonTmdb(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function filtrarPorGenerosSolicitados(lista, withGenres) {
  if (!withGenres) return lista
  const idsSolicitados = withGenres
    .split(/[,|]/)
    .map((id) => Number(id.trim()))
    .filter(Number.isFinite)

  if (idsSolicitados.length === 0) return lista
  return lista.filter((item) =>
    Array.isArray(item.genre_ids) && item.genre_ids.some((id) => idsSolicitados.includes(id)),
  )
}

function manejadorTmdbPorDefecto(url) {
  const page = Number(url.searchParams.get('page') || 1)
  const withGenres = url.searchParams.get('with_genres')

  if (url.pathname.endsWith('/trending/all/week') || url.pathname.endsWith('/trending/all/day')) {
    return respuestaJsonTmdb({
      page,
      total_pages: 600,
      total_results: 3,
      results: [peliculaPeleaTmdb, peliculaMatrixTmdb, serieTronosTmdb],
    })
  }

  if (url.pathname.endsWith('/discover/movie') || url.pathname.endsWith('/movie/popular')) {
    const peliculas = filtrarPorGenerosSolicitados([peliculaPeleaTmdb, peliculaMatrixTmdb], withGenres)
    return respuestaJsonTmdb({
      page,
      total_pages: 120,
      total_results: peliculas.length,
      results: peliculas,
    })
  }

  if (url.pathname.endsWith('/discover/tv') || url.pathname.endsWith('/tv/popular')) {
    const series = filtrarPorGenerosSolicitados([serieTronosTmdb], withGenres)
    return respuestaJsonTmdb({
      page,
      total_pages: 80,
      total_results: series.length,
      results: series,
    })
  }

  if (url.pathname.endsWith('/search/multi')) {
    return respuestaJsonTmdb({
      page,
      total_pages: 4,
      total_results: 2,
      results: [
        peliculaMatrixTmdb,
        serieTronosTmdb,
        { id: 9999, media_type: 'person', name: 'Persona Ignorada' },
      ],
    })
  }

  if (url.pathname.endsWith('/search/movie')) {
    return respuestaJsonTmdb({
      page,
      total_pages: 2,
      total_results: 1,
      results: [peliculaMatrixTmdb],
    })
  }

  if (url.pathname.endsWith('/search/tv')) {
    return respuestaJsonTmdb({
      page,
      total_pages: 1,
      total_results: 1,
      results: [serieTronosTmdb],
    })
  }

  if (url.pathname.endsWith('/movie/550')) {
    return respuestaJsonTmdb(detallePeliculaTmdb, 200)
  }

  if (url.pathname.endsWith('/tv/1399')) {
    return respuestaJsonTmdb(detalleSerieTmdb, 200)
  }

  if (url.pathname.includes('/movie/') || url.pathname.includes('/tv/')) {
    return respuestaJsonTmdb(
      { status_code: 34, status_message: 'The resource you requested could not be found.' },
      404,
    )
  }

  return respuestaJsonTmdb({ page: 1, total_pages: 1, total_results: 0, results: [] })
}

const realFetch = globalThis.fetch.bind(globalThis)
let llamadasTmdb = []
let simuladorTmdb = manejadorTmdbPorDefecto

const fetchMock = mock.method(globalThis, 'fetch', async (input, init) => {
  const urlTexto = typeof input === 'string' || input instanceof URL ? String(input) : input.url

  if (urlTexto.startsWith('http://127.0.0.1')) {
    return realFetch(input, init)
  }

  const url = new URL(urlTexto)
  llamadasTmdb.push({ url, init })
  return simuladorTmdb(url, init)
})

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

beforeEach(() => {
  env.tmdbApiKey = SECRETO_TMDB
  env.tmdbBaseUrl = 'https://tmdb.invalid/3'
  env.tmdbImageBaseUrl = 'https://image.tmdb.org/t/p/w500'
  env.tmdbTimeoutMs = 2500
  llamadasTmdb = []
  simuladorTmdb = manejadorTmdbPorDefecto
})

after(async () => {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }
  } finally {
    fetchMock.mock.restore()
  }
})

test('GET /api/catalogo devuelve el listado general con fuente tmdb, filtros y paginación', async () => {
  const endpoint = `${baseUrl}/api/catalogo`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.fuente, 'tmdb')
  assert.equal(body.filtros.tipo, 'all')
  assert.equal(body.filtros.categoria, 'Todos')
  assert.equal(body.filtros.pagina, 1)
  assert.ok(Array.isArray(body.resultados))
  assert.ok(body.resultados.length >= 2)
  assert.equal(body.paginacion.pagina, 1)
  assert.ok(llamadasTmdb.length >= 1)
})

test('GET /api/catalogo normaliza cada elemento con los campos requeridos por la galería', async () => {
  const endpoint = `${baseUrl}/api/catalogo`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 200)
  const pelicula = body.resultados.find((item) => item.tmdbId === 550)
  const serie = body.resultados.find((item) => item.tmdbId === 1399)

  assert.ok(pelicula)
  assert.equal(pelicula.id, 'movie-550')
  assert.equal(pelicula.titulo, 'El club de la pelea')
  assert.equal(pelicula.tipo, 'Película')
  assert.equal(pelicula.tipoTmdb, 'movie')
  assert.equal(Number(pelicula.anio), 1999)
  assert.equal(pelicula.fecha, '1999-10-15')
  assert.ok(pelicula.generos.includes('Drama'))
  assert.ok(pelicula.generos.includes('Acción'))
  assert.equal(pelicula.calificacion, 8.4)
  assert.equal(pelicula.sinopsis, pelicula.descripcion)
  assert.ok(pelicula.portada.startsWith('https://image.tmdb.org/t/p/'))
  assert.ok(pelicula.portada.endsWith('/pelea.jpg'))
  assert.equal(pelicula.portada, pelicula.poster)
  assert.equal(pelicula.esDemostracion, false)

  assert.ok(serie)
  assert.equal(serie.id, 'tv-1399')
  assert.equal(serie.titulo, 'Juego de tronos')
  assert.equal(serie.tipo, 'Serie')
  assert.equal(serie.tipoTmdb, 'tv')
  assert.equal(Number(serie.anio), 2011)
  assert.ok(serie.generos.includes('Ciencia ficción'))
  assert.equal(serie.esDemostracion, false)
})

test('GET /api/catalogo asigna valores por defecto seguros cuando TMDB omite portada, fecha o sinopsis', async () => {
  simuladorTmdb = () =>
    respuestaJsonTmdb({
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [
        {
          id: 777,
          media_type: 'movie',
          title: 'Obra sin metadatos',
          overview: '   ',
          release_date: '',
          genre_ids: [],
          vote_average: 0,
          poster_path: null,
        },
      ],
    })

  const res = await fetch(`${baseUrl}/api/catalogo?tipo=movie`)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.resultados.length, 1)
  const item = body.resultados[0]
  assert.equal(item.tmdbId, 777)
  assert.equal(item.portada, null)
  assert.equal(item.poster, null)
  assert.equal(item.anio, null)
  assert.equal(item.fecha, null)
  assert.equal(item.calificacion, null)
  assert.equal(typeof item.sinopsis, 'string')
  assert.ok(item.sinopsis.length > 0)
  assert.equal(item.esDemostracion, false)
})

test('GET /api/catalogo?tipo=movie filtra exclusivamente películas', async () => {
  const endpoint = `${baseUrl}/api/catalogo?tipo=movie`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.filtros.tipo, 'movie')
  assert.ok(body.resultados.length > 0)
  assert.ok(body.resultados.every((item) => item.tipo === 'Película' && item.tipoTmdb === 'movie'))
})

test('GET /api/catalogo?tipo=tv filtra exclusivamente series', async () => {
  const endpoint = `${baseUrl}/api/catalogo?tipo=tv`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.filtros.tipo, 'tv')
  assert.ok(body.resultados.length > 0)
  assert.ok(body.resultados.every((item) => item.tipo === 'Serie' && item.tipoTmdb === 'tv'))
})

test('GET /api/catalogo filtra por categoría oficial de la galería (Acción y Ciencia ficción)', async () => {
  const urlAccion = `${baseUrl}/api/catalogo?tipo=movie&categoria=${encodeURIComponent('Acción')}`
  const urlCienciaFiccion = `${baseUrl}/api/catalogo?tipo=tv&categoria=${encodeURIComponent('Ciencia ficción')}`

  const resAccion = await fetch(urlAccion)
  const bodyAccion = await resAccion.json()
  const resCiencia = await fetch(urlCienciaFiccion)
  const bodyCiencia = await resCiencia.json()

  assert.equal(resAccion.status, 200)
  assert.equal(bodyAccion.filtros.categoria, 'Acción')
  assert.ok(bodyAccion.resultados.length > 0)
  assert.ok(bodyAccion.resultados.every((item) => item.generos.includes('Acción')))

  assert.equal(resCiencia.status, 200)
  assert.equal(bodyCiencia.filtros.categoria, 'Ciencia ficción')
  assert.ok(bodyCiencia.resultados.length > 0)
  assert.ok(bodyCiencia.resultados.every((item) => item.generos.includes('Ciencia ficción')))
})

test('GET /api/catalogo?busqueda=... realiza búsqueda por texto recortando espacios y excluyendo personas', async () => {
  const endpoint = `${baseUrl}/api/catalogo?busqueda=${encodeURIComponent('  Matrix  ')}`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.filtros.busqueda, 'Matrix')
  assert.ok(body.resultados.length >= 1)
  assert.ok(body.resultados.some((item) => item.tmdbId === 603))
  assert.ok(body.resultados.every((item) => item.tipoTmdb === 'movie' || item.tipoTmdb === 'tv'))
  assert.equal(llamadasTmdb[0].url.searchParams.get('query'), 'Matrix')
})

test('GET /api/catalogo?pagina=3 respeta la página solicitada y acota totalPaginas a 500', async () => {
  const endpoint = `${baseUrl}/api/catalogo?pagina=3`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.filtros.pagina, 3)
  assert.equal(body.paginacion.pagina, 3)
  assert.ok(body.paginacion.totalPaginas <= 500)
  assert.equal(llamadasTmdb[0].url.searchParams.get('page'), '3')
})

test('GET /api/catalogo/movie/550 devuelve el detalle normalizado de una película', async () => {
  const endpoint = `${baseUrl}/api/catalogo/movie/550`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.id, 'movie-550')
  assert.equal(body.tmdbId, 550)
  assert.equal(body.titulo, 'El club de la pelea')
  assert.equal(body.tipo, 'Película')
  assert.equal(body.tipoTmdb, 'movie')
  assert.equal(body.duracionMinutos, 139)
  assert.equal(body.numeroTemporadas, null)
  assert.equal(body.numeroEpisodios, null)
  assert.equal(body.estadoPublicacion, 'Released')
  assert.equal(body.idiomaOriginal, 'en')
  assert.ok(body.backdrop.endsWith('/pelea-bg.jpg'))
  assert.equal(body.esDemostracion, false)
})

test('GET /api/catalogo/tv/1399 devuelve el detalle normalizado de una serie', async () => {
  const endpoint = `${baseUrl}/api/catalogo/tv/1399`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.id, 'tv-1399')
  assert.equal(body.tmdbId, 1399)
  assert.equal(body.titulo, 'Juego de tronos')
  assert.equal(body.tipo, 'Serie')
  assert.equal(body.tipoTmdb, 'tv')
  assert.equal(body.duracionMinutos, 55)
  assert.equal(body.numeroTemporadas, 8)
  assert.equal(body.numeroEpisodios, 73)
  assert.equal(body.estadoPublicacion, 'Ended')
  assert.equal(body.idiomaOriginal, 'en')
  assert.ok(body.generos.includes('Ciencia ficción'))
  assert.equal(body.esDemostracion, false)
})

test('GET /api/catalogo/movie/999999 responde 404 cuando el contenido no existe en TMDB', async () => {
  const endpoint = `${baseUrl}/api/catalogo/movie/999999`

  const res = await fetch(endpoint)
  const body = await res.json()

  assert.equal(res.status, 404)
  assert.deepEqual(body, { error: 'El contenido solicitado no existe en el catálogo.' })
})

test('GET /api/catalogo con parámetros de consulta inválidos responde 400 sin consultar TMDB', async () => {
  const busquedaExcesiva = 'a'.repeat(121)
  const queriesInvalidas = [
    '?tipo=anime',
    '?categoria=Musical',
    '?pagina=0',
    '?pagina=-2',
    '?pagina=501',
    '?pagina=abc',
    '?pagina=1.5',
    `?busqueda=${busquedaExcesiva}`,
    '?tipo=movie&tipo=tv',
    '?pagina=1&pagina=2',
  ]

  for (const query of queriesInvalidas) {
    const res = await fetch(`${baseUrl}/api/catalogo${query}`)
    const body = await res.json()

    assert.equal(res.status, 400, `Se esperaba 400 para la consulta ${query}`)
    assert.equal(typeof body.error, 'string')
  }

  assert.equal(llamadasTmdb.length, 0)
})

test('GET /api/catalogo/:tipo/:tmdbId con parámetros de ruta inválidos responde 400 sin consultar TMDB', async () => {
  const rutasInvalidas = [
    '/api/catalogo/all/550',
    '/api/catalogo/person/550',
    '/api/catalogo/movie/0',
    '/api/catalogo/movie/-10',
    '/api/catalogo/movie/abc',
    '/api/catalogo/tv/12.34',
  ]

  for (const ruta of rutasInvalidas) {
    const res = await fetch(`${baseUrl}${ruta}`)
    const body = await res.json()

    assert.equal(res.status, 400, `Se esperaba 400 para la ruta ${ruta}`)
    assert.equal(typeof body.error, 'string')
  }

  assert.equal(llamadasTmdb.length, 0)
})

test('responde 500 cuando TMDB_API_KEY no está configurada y no realiza llamadas externas', async (t) => {
  t.mock.method(console, 'error', () => {})
  env.tmdbApiKey = ''

  const res = await fetch(`${baseUrl}/api/catalogo`)
  const body = await res.json()

  assert.equal(res.status, 500)
  assert.deepEqual(body, {
    error: 'El servicio de catálogo no tiene configurada la credencial de TMDB.',
  })
  assert.equal(llamadasTmdb.length, 0)
})

test('responde 502 cuando TMDB falla (500 o 401) sin exponer la clave secreta en la respuesta ni en el log', async (t) => {
  const logError = t.mock.method(console, 'error', () => {})
  simuladorTmdb = () =>
    respuestaJsonTmdb(
      { status_code: 7, status_message: `Invalid API key: ${SECRETO_TMDB}` },
      401,
    )

  const res = await fetch(`${baseUrl}/api/catalogo`)
  const textoRespuesta = await res.text()

  assert.equal(res.status, 502)
  assert.deepEqual(JSON.parse(textoRespuesta), {
    error: 'No fue posible consultar el catálogo externo de TMDB en este momento.',
  })
  assert.ok(!textoRespuesta.includes(SECRETO_TMDB))

  const mensajesRegistrados = logError.mock.calls.map((call) => call.arguments.join(' ')).join(' ')
  assert.ok(!mensajesRegistrados.includes(SECRETO_TMDB))
})

test('responde 503 cuando la petición hacia TMDB excede el tiempo límite (TimeoutError / AbortError)', async (t) => {
  t.mock.method(console, 'error', () => {})
  simuladorTmdb = () => {
    const error = new Error('The operation was aborted due to timeout')
    error.name = 'TimeoutError'
    throw error
  }

  const res = await fetch(`${baseUrl}/api/catalogo/movie/550`)
  const body = await res.json()

  assert.equal(res.status, 503)
  assert.deepEqual(body, {
    error: 'El catálogo externo de TMDB tardó demasiado en responder.',
  })
})

test('métodos HTTP no implementados en /api/catalogo responden 404 en JSON sin consultar TMDB', async () => {
  const metodos = ['POST', 'PUT', 'DELETE', 'PATCH']

  for (const method of metodos) {
    const res = await fetch(`${baseUrl}/api/catalogo`, { method })
    assert.equal(res.status, 404, `Se esperaba 404 para el método ${method}`)
  }

  assert.equal(llamadasTmdb.length, 0)
})