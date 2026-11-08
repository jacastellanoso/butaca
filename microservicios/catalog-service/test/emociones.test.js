import assert from 'node:assert/strict'
import { after, beforeEach, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { coincideConEmocion, EMOCIONES, emocionesDeGeneros, GENERO as G, REGLAS_EMOCION } from '../src/constants/emociones.js'

process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('../.env.example', import.meta.url))
const { env } = await import('../src/config/env.js')
const { app } = await import('../src/app.js')

// ── Reglas (constants/emociones.js) ──────────────────────────────────────

test('las siete emociones tienen reglas para películas y series', () => {
  assert.deepEqual(EMOCIONES, ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'])
  for (const emocion of EMOCIONES) {
    for (const tipo of ['movie', 'tv']) {
      const regla = REGLAS_EMOCION[emocion][tipo]
      assert.ok(regla.generos.length > 0, `${emocion}/${tipo} sin géneros`)
      assert.ok(regla.generos.every((id) => !regla.excluidos.includes(id)), `${emocion}/${tipo} contradictoria`)
    }
  }
})

test('un título puede corresponder a varias emociones (ejemplos con sus géneros de TMDB)', () => {
  const ejemplos = [
    ['Coco', 'movie', [10751, 16, 14, 10402, 35, 12], ['happy', 'sad', 'neutral']],
    ['El caballero oscuro', 'movie', [18, 28, 80, 53], ['angry', 'fearful', 'surprised']],
    ['Stranger Things', 'tv', [18, 10765, 9648], ['fearful', 'surprised', 'sad']],
    ['Zootrópolis 2', 'movie', [16, 10751, 35, 12, 9648], ['happy', 'neutral', 'surprised']],
    ['Dexter: Resurrección', 'tv', [80, 18, 9648], ['fearful', 'disgusted', 'angry', 'surprised']],
    ['Los 100', 'tv', [10765, 18, 10759, 9648], ['fearful', 'sad', 'angry', 'surprised']],
    ['Los anillos de poder', 'tv', [10759, 10765, 18], ['surprised', 'fearful', 'happy', 'sad']],
  ]
  for (const [titulo, tipo, generos, esperadas] of ejemplos) {
    const emociones = emocionesDeGeneros(generos, tipo)
    for (const emocion of esperadas) assert.ok(emociones.includes(emocion), `${titulo} debería incluir ${emocion}: ${emociones}`)
  }
})

test('no se relacionan títulos sin una relación razonable', () => {
  // Terror nunca es «Calma» ni «Alegría»; lo familiar o animado nunca es «Miedo» ni «Desagrado».
  assert.equal(coincideConEmocion([G.terror], 'neutral'), false)
  assert.equal(coincideConEmocion([G.terror, G.comedia], 'happy'), false)
  assert.equal(coincideConEmocion([G.animacion, G.fantasia], 'fearful'), false)
  assert.equal(coincideConEmocion([G.familiar, G.misterio], 'disgusted'), false)
  // Un drama solo no es «Enojo» ni «Desagrado»; con thriller o crimen sí.
  assert.equal(coincideConEmocion([G.drama], 'angry'), false)
  assert.equal(coincideConEmocion([G.drama, G.crimen], 'angry'), true)
  assert.equal(coincideConEmocion([G.drama], 'disgusted'), false)
  assert.equal(coincideConEmocion([G.drama, G.thriller], 'disgusted'), true)
  // En series, una animación de comedia no es «Tristeza».
  assert.equal(coincideConEmocion([G.animacion, G.comedia], 'sad', 'tv'), false)
  assert.equal(coincideConEmocion([G.drama], 'sad', 'tv'), true)
  // Sin géneros o emoción desconocida: ninguna relación.
  assert.deepEqual(emocionesDeGeneros([], 'movie'), [])
  assert.equal(coincideConEmocion([G.comedia], 'euforia'), false)
})

// ── GET /api/catalogo?emocion= ───────────────────────────────────────────

const pelicula = (id, genre_ids) => ({ id, title: `Película ${id}`, overview: 'x', release_date: '2024-01-01', vote_average: 7, poster_path: null, genre_ids })
const serie = (id, genre_ids) => ({ id, name: `Serie ${id}`, overview: 'x', first_air_date: '2024-01-01', vote_average: 7, poster_path: null, genre_ids })

let llamadas = []
let respuestaPara = () => ({ page: 1, total_pages: 1, total_results: 0, results: [] })
const realFetch = globalThis.fetch.bind(globalThis)
const fetchMock = mock.method(globalThis, 'fetch', async (input, init) => {
  const texto = typeof input === 'string' || input instanceof URL ? String(input) : input.url
  if (texto.startsWith('http://127.0.0.1')) return realFetch(input, init)
  const url = new URL(texto)
  llamadas.push(url)
  return new Response(JSON.stringify(respuestaPara(url)), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
const base = `http://127.0.0.1:${server.address().port}`
after(() => { fetchMock.mock.restore(); server.close() })
beforeEach(() => {
  env.tmdbApiKey = 'clave-de-prueba'
  env.tmdbBaseUrl = 'https://tmdb.invalid/3'
  llamadas = []
})

test('emocion=fearful consulta discover con los géneros de Miedo, sin los excluidos, y descarta lo que no corresponde', async () => {
  respuestaPara = () => ({
    page: 1, total_pages: 7, total_results: 140,
    results: [pelicula(1, [G.terror]), pelicula(2, [G.animacion, G.fantasia]), pelicula(3, [G.thriller, G.crimen]), pelicula(4, [G.comedia])],
  })
  const res = await fetch(`${base}/api/catalogo?tipo=movie&emocion=fearful&pagina=2`)
  const cuerpo = await res.json()
  assert.equal(res.status, 200)
  assert.equal(llamadas.length, 1)
  assert.equal(llamadas[0].pathname, '/3/discover/movie')
  assert.equal(llamadas[0].searchParams.get('page'), '2')
  assert.deepEqual(llamadas[0].searchParams.get('with_genres').split('|').map(Number), REGLAS_EMOCION.fearful.movie.generos)
  assert.deepEqual(llamadas[0].searchParams.get('without_genres').split(',').map(Number), REGLAS_EMOCION.fearful.movie.excluidos)
  // La animación familiar y la comedia no se recomiendan para «Miedo».
  assert.deepEqual(cuerpo.resultados.map((r) => r.tmdbId), [1, 3])
  assert.ok(cuerpo.resultados.every((r) => r.emociones.includes('fearful')))
  assert.equal(cuerpo.filtros.emocion, 'fearful')
  assert.deepEqual(cuerpo.paginacion, { pagina: 2, totalPaginas: 7, totalResultados: 140, total: 140 })
})

test('emocion con tipo «all» combina películas y series intercaladas', async () => {
  respuestaPara = (url) => url.pathname.endsWith('/movie')
    ? { page: 1, total_pages: 3, total_results: 60, results: [pelicula(10, [G.comedia]), pelicula(11, [G.animacion])] }
    : { page: 1, total_pages: 5, total_results: 100, results: [serie(20, [G.comedia]), serie(21, [G.crimen, G.comedia])] }
  const cuerpo = await (await fetch(`${base}/api/catalogo?emocion=happy`)).json()
  assert.deepEqual(llamadas.map((u) => u.pathname).sort(), ['/3/discover/movie', '/3/discover/tv'])
  // La serie de crimen no corresponde a «Alegría».
  assert.deepEqual(cuerpo.resultados.map((r) => r.id), ['movie-10', 'tv-20', 'movie-11'])
  assert.equal(cuerpo.paginacion.totalPaginas, 5)
})

test('búsqueda por nombre combinada con emoción filtra los resultados', async () => {
  respuestaPara = () => ({
    page: 1, total_pages: 1, total_results: 2,
    results: [{ ...pelicula(30, [G.comedia]), media_type: 'movie' }, { ...pelicula(31, [G.terror]), media_type: 'movie' }],
  })
  const cuerpo = await (await fetch(`${base}/api/catalogo?busqueda=noche&emocion=happy`)).json()
  assert.equal(llamadas[0].pathname, '/3/search/multi')
  assert.equal(llamadas[0].searchParams.get('query'), 'noche')
  assert.deepEqual(cuerpo.resultados.map((r) => r.tmdbId), [30])
})

test('una emoción desconocida responde 400 sin consultar TMDB', async () => {
  const res = await fetch(`${base}/api/catalogo?emocion=euforia`)
  assert.equal(res.status, 400)
  assert.equal(llamadas.length, 0)
})
