import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// Se evita cargar credenciales reales; todos los accesos externos se simulan en memoria.
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('../.env.example', import.meta.url))
process.env.SUPABASE_URL = 'https://supabase.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only'
process.env.DATABASE_URL = 'postgresql://test:test@database.invalid:5432/test'
process.env.DIRECT_URL = process.env.DATABASE_URL

const { supabase } = await import('../src/lib/supabase.js')
const { prisma } = await import('../src/lib/prisma.js')

const USUARIOS = {
  'token-a': 'usuario-a',
  'token-b': 'usuario-b',
  'token-sin-registro': 'usuario-sin-registro',
}
const SECRETO = 'postgresql://secreto:clave@privado.supabase.com/base'

let favoritos
let historial
let usuariosLocales
let secuencia

const getUser = mock.method(supabase.auth, 'getUser', async (token) => {
  if (token === 'token-caida') throw new Error('fetch failed')
  const id = USUARIOS[token]
  if (id) return { data: { user: { id, email: `${id}@example.com` } }, error: null }
  return { data: { user: null }, error: { status: 401, message: 'detalle privado' } }
})

// Simulación en memoria de los delegados prisma.favorito y prisma.historialRecomendacion.
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function cumple(registro, where = {}) {
  return Object.entries(where).every(([campo, condicion]) => {
    if (campo === 'usuarioId_tmdbId_tipo' && condicion && typeof condicion === 'object') {
      return (
        registro.usuarioId === condicion.usuarioId &&
        registro.tmdbId === condicion.tmdbId &&
        registro.tipo === condicion.tipo
      )
    }
    if (campo === 'creadoEn' && condicion && typeof condicion === 'object') {
      return (
        (!condicion.gte || registro.creadoEn >= condicion.gte) &&
        (!condicion.lte || registro.creadoEn <= condicion.lte)
      )
    }
    return registro[campo] === condicion
  })
}

function seleccionar(registro, select) {
  if (!select) return { ...registro }
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, activo]) => Boolean(activo))
      .map(([campo]) => [campo, registro[campo]]),
  )
}

function ordenar(lista, orderBy = [{ creadoEn: 'desc' }, { id: 'desc' }]) {
  const criterios = Array.isArray(orderBy) ? orderBy : [orderBy]
  return [...lista].sort((a, b) => {
    for (const criterio of criterios) {
      const [[campo, sentido]] = Object.entries(criterio)
      if (a[campo] < b[campo]) return sentido === 'asc' ? -1 : 1
      if (a[campo] > b[campo]) return sentido === 'asc' ? 1 : -1
    }
    return 0
  })
}

const favFindUnique = mock.fn(async ({ where, select }) => {
  const encontrado = favoritos.find((r) => cumple(r, where))
  return encontrado ? seleccionar(encontrado, select) : null
})

const favCreate = mock.fn(async ({ data, select }) => {
  if (!usuariosLocales.has(data.usuarioId)) {
    throw Object.assign(new Error(`Foreign key constraint violated: ${SECRETO}`), { code: 'P2003' })
  }
  const duplicado = favoritos.find(
    (r) => r.usuarioId === data.usuarioId && r.tmdbId === data.tmdbId && r.tipo === data.tipo,
  )
  if (duplicado) {
    throw Object.assign(new Error(`Unique constraint failed: ${SECRETO}`), { code: 'P2002' })
  }
  const registro = {
    id: uuid(++secuencia),
    poster: null,
    creadoEn: new Date(),
    ...data,
  }
  favoritos.push(registro)
  return seleccionar(registro, select)
})

const favFindMany = mock.fn(async ({ where, orderBy, skip = 0, take = 20, select }) =>
  ordenar(favoritos.filter((r) => cumple(r, where)), orderBy)
    .slice(skip, skip + take)
    .map((r) => seleccionar(r, select)),
)

const favCount = mock.fn(async ({ where } = {}) => favoritos.filter((r) => cumple(r, where)).length)

const favDeleteMany = mock.fn(async ({ where }) => {
  const inicial = favoritos.length
  favoritos = favoritos.filter((r) => !cumple(r, where))
  return { count: inicial - favoritos.length }
})

const histCreate = mock.fn(async ({ data, select }) => {
  if (!usuariosLocales.has(data.usuarioId)) {
    throw Object.assign(new Error(`Foreign key constraint violated: ${SECRETO}`), { code: 'P2003' })
  }
  const registro = {
    id: uuid(++secuencia),
    poster: null,
    calificacion: null,
    creadoEn: new Date(),
    ...data,
  }
  historial.push(registro)
  return seleccionar(registro, select)
})

const histFindMany = mock.fn(async ({ where, orderBy, skip = 0, take = 20, select }) =>
  ordenar(historial.filter((r) => cumple(r, where)), orderBy)
    .slice(skip, skip + take)
    .map((r) => seleccionar(r, select)),
)

const histCount = mock.fn(async ({ where } = {}) => historial.filter((r) => cumple(r, where)).length)

const histDeleteMany = mock.fn(async ({ where }) => {
  const inicial = historial.length
  historial = historial.filter((r) => !cumple(r, where))
  return { count: inicial - historial.length }
})

const originalFavorito = prisma.favorito
const originalHistorial = prisma.historialRecomendacion

prisma.favorito = {
  findUnique: favFindUnique,
  create: favCreate,
  findMany: favFindMany,
  count: favCount,
  deleteMany: favDeleteMany,
}

prisma.historialRecomendacion = {
  create: histCreate,
  findMany: histFindMany,
  count: histCount,
  deleteMany: histDeleteMany,
}

const operaciones = [
  favFindUnique,
  favCreate,
  favFindMany,
  favCount,
  favDeleteMany,
  histCreate,
  histFindMany,
  histCount,
  histDeleteMany,
]

const { app } = await import('../src/app.js')

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

function semillaFavorito(usuarioId, tmdbId, tipo, titulo, fecha, extra = {}) {
  return {
    id: uuid(++secuencia),
    usuarioId,
    tmdbId,
    tipo,
    titulo,
    poster: '/poster-ejemplo.jpg',
    creadoEn: new Date(fecha),
    ...extra,
  }
}

function semillaHistorial(usuarioId, emocion, tmdbId, tipo, titulo, fecha, extra = {}) {
  return {
    id: uuid(++secuencia),
    usuarioId,
    emocion,
    tmdbId,
    tipo,
    titulo,
    poster: '/poster-historial.jpg',
    calificacion: 8.5,
    creadoEn: new Date(fecha),
    ...extra,
  }
}

beforeEach(() => {
  secuencia = 0
  usuariosLocales = new Set(['usuario-a', 'usuario-b'])
  favoritos = [
    semillaFavorito('usuario-a', 550, 'movie', 'El club de la pelea', '2026-10-01T10:00:00.000Z'),
    semillaFavorito('usuario-a', 1396, 'tv', 'Breaking Bad', '2026-10-02T10:00:00.000Z'),
    semillaFavorito('usuario-a', 680, 'movie', 'Tiempos violentos', '2026-10-03T10:00:00.000Z', {
      poster: null,
    }),
    semillaFavorito('usuario-b', 13, 'movie', 'Forrest Gump', '2026-10-02T12:00:00.000Z'),
  ]
  historial = [
    semillaHistorial('usuario-a', 'happy', 550, 'movie', 'El club de la pelea', '2026-10-01T10:00:00.000Z'),
    semillaHistorial('usuario-a', 'sad', 1396, 'tv', 'Breaking Bad', '2026-10-02T10:00:00.000Z', {
      calificacion: null,
    }),
    semillaHistorial('usuario-a', 'happy', 680, 'movie', 'Tiempos violentos', '2026-10-03T10:00:00.000Z', {
      poster: null,
      calificacion: 9.2,
    }),
    semillaHistorial('usuario-b', 'fearful', 13, 'movie', 'Forrest Gump', '2026-10-02T12:00:00.000Z'),
  ]
  getUser.mock.resetCalls()
  for (const operacion of operaciones) operacion.mock.resetCalls()
})

after(async () => {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }
  } finally {
    getUser.mock.restore()
    prisma.favorito = originalFavorito
    prisma.historialRecomendacion = originalHistorial
  }
})

function consultar(
  recurso,
  method,
  { ruta = '', token = 'token-a', body, raw, query = '', headers = {} } = {},
) {
  const tieneBody = body !== undefined || raw !== undefined
  return fetch(`${baseUrl}/api/${recurso}${ruta}${query}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tieneBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(tieneBody ? { body: raw ?? JSON.stringify(body) } : {}),
  })
}

const favoritoValido = {
  tmdbId: 27205,
  tipo: 'movie',
  titulo: 'El origen',
  poster: '/origen.jpg',
}

const historialValido = {
  emocion: 'happy',
  tmdbId: 27205,
  tipo: 'movie',
  titulo: 'El origen',
  poster: '/origen.jpg',
  calificacion: 8.8,
}

const sinLlamadasAPrisma = () => {
  for (const operacion of operaciones) assert.equal(operacion.mock.callCount(), 0)
}

// Autenticación

test('las rutas de /api/favoritos sin token responden 401 sin consultar Prisma', async () => {
  const casos = [
    ['GET', '', undefined],
    ['POST', '', favoritoValido],
    ['DELETE', `/${uuid(1)}`, undefined],
  ]

  for (const [method, ruta, body] of casos) {
    const res = await consultar('favoritos', method, { ruta, token: null, body })
    assert.equal(res.status, 401, `${method} /api/favoritos${ruta}`)
    assert.deepEqual(await res.json(), {
      error: 'Falta el token de sesión o su formato es incorrecto.',
    })
  }
  assert.equal(getUser.mock.callCount(), 0)
  sinLlamadasAPrisma()
})

test('las rutas de /api/historial sin token responden 401 sin consultar Prisma', async () => {
  const casos = [
    ['GET', '', undefined],
    ['POST', '', historialValido],
    ['DELETE', `/${uuid(5)}`, undefined],
  ]

  for (const [method, ruta, body] of casos) {
    const res = await consultar('historial', method, { ruta, token: null, body })
    assert.equal(res.status, 401, `${method} /api/historial${ruta}`)
    assert.deepEqual(await res.json(), {
      error: 'Falta el token de sesión o su formato es incorrecto.',
    })
  }
  assert.equal(getUser.mock.callCount(), 0)
  sinLlamadasAPrisma()
})

test('un token inválido o expirado en favoritos o historial responde 401 sin consultar Prisma', async () => {
  const casos = [
    ['favoritos', 'GET', '', undefined],
    ['favoritos', 'POST', '', favoritoValido],
    ['favoritos', 'DELETE', `/${uuid(1)}`, undefined],
    ['historial', 'GET', '', undefined],
    ['historial', 'POST', '', historialValido],
    ['historial', 'DELETE', `/${uuid(5)}`, undefined],
  ]

  for (const [recurso, method, ruta, body] of casos) {
    const res = await consultar(recurso, method, { ruta, token: 'token-falso', body })
    assert.equal(res.status, 401, `${method} /api/${recurso}${ruta}`)
    assert.deepEqual(await res.json(), { error: 'Sesión inválida o expirada.' })
  }
  assert.equal(getUser.mock.callCount(), casos.length)
  sinLlamadasAPrisma()
})

test('un encabezado Authorization con formato incorrecto responde 401', async () => {
  for (const authorization of ['token-a', 'Basic token-a', 'Bearer', 'Bearer token-a extra']) {
    const res = await consultar('favoritos', 'GET', {
      token: null,
      headers: { Authorization: authorization },
    })
    assert.equal(res.status, 401, authorization)
  }
  assert.equal(getUser.mock.callCount(), 0)
  sinLlamadasAPrisma()
})

test('si Supabase falla o no responde se devuelve 503 sin culpar al token', async () => {
  const resFav = await consultar('favoritos', 'POST', {
    token: 'token-caida',
    body: favoritoValido,
  })
  assert.equal(resFav.status, 503)
  assert.deepEqual(await resFav.json(), {
    error: 'El servicio de autenticación no está disponible. Intentá de nuevo.',
  })

  const resHist = await consultar('historial', 'GET', { token: 'token-caida' })
  assert.equal(resHist.status, 503)
  sinLlamadasAPrisma()
})

// Favoritos: POST /api/favoritos

test('POST /api/favoritos crea un favorito nuevo con 201 usando el usuario del token', async () => {
  const res = await consultar('favoritos', 'POST', {
    body: {
      ...favoritoValido,
      usuarioId: 'usuario-b',
      id: 'id-forzado',
      creadoEn: '1999-01-01T00:00:00.000Z',
    },
    query: '?usuarioId=usuario-b',
    headers: { 'X-User-Id': 'usuario-b' },
  })

  assert.equal(res.status, 201)
  const body = await res.json()
  assert.deepEqual(Object.keys(body).sort(), ['creadoEn', 'id', 'poster', 'tipo', 'titulo', 'tmdbId'])
  assert.equal(body.tmdbId, 27205)
  assert.equal(body.tipo, 'movie')
  assert.equal(body.titulo, 'El origen')
  assert.equal(body.poster, '/origen.jpg')
  assert.notEqual(body.id, 'id-forzado')
  assert.ok(!('usuarioId' in body))

  assert.equal(favCreate.mock.callCount(), 1)
  const { data } = favCreate.mock.calls[0].arguments[0]
  assert.equal(data.usuarioId, 'usuario-a')
})

test('POST /api/favoritos es idempotente y responde 200 si (usuarioId, tmdbId, tipo) ya existía', async () => {
  const totalAntes = favoritos.length
  const existente = favoritos[0]

  const res = await consultar('favoritos', 'POST', {
    body: {
      tmdbId: existente.tmdbId,
      tipo: existente.tipo,
      titulo: 'Título distinto enviado de nuevo',
      poster: '/otro-poster.jpg',
    },
  })

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.id, existente.id)
  assert.equal(body.tmdbId, existente.tmdbId)
  assert.equal(body.tipo, existente.tipo)
  assert.equal(favoritos.length, totalAntes)
})

test('POST /api/favoritos permite el mismo tmdbId si cambia el tipo (movie vs tv) o si es otro usuario', async () => {
  const resTv = await consultar('favoritos', 'POST', {
    token: 'token-a',
    body: { tmdbId: 550, tipo: 'tv', titulo: 'Serie con mismo ID TMDB' },
  })
  assert.equal(resTv.status, 201)

  const resOtroUsuario = await consultar('favoritos', 'POST', {
    token: 'token-b',
    body: { tmdbId: 550, tipo: 'movie', titulo: 'El club de la pelea' },
  })
  assert.equal(resOtroUsuario.status, 201)
  assert.equal(favoritos.length, 6)
})

test('POST /api/favoritos admite poster ausente o null y lo guarda como null', async () => {
  const res = await consultar('favoritos', 'POST', {
    body: { tmdbId: 99999, tipo: 'tv', titulo: '  Severance  ' },
  })
  assert.equal(res.status, 201)
  const body = await res.json()
  assert.equal(body.titulo, 'Severance')
  assert.equal(body.poster, null)
})

test('POST /api/favoritos de un usuario sin registro local responde 409 sin filtrar detalles internos', async () => {
  const res = await consultar('favoritos', 'POST', {
    token: 'token-sin-registro',
    body: favoritoValido,
  })
  assert.equal(res.status, 409)
  const texto = await res.text()
  assert.ok(texto.includes('POST /api/usuarios'))
  assert.ok(!texto.includes('secreto'))
  assert.equal(favoritos.length, 4)
})

test('POST /api/favoritos con datos inválidos responde 400 y no guarda en Prisma', async () => {
  const casos = [
    { ...favoritoValido, tmdbId: 0 },
    { ...favoritoValido, tmdbId: -10 },
    { ...favoritoValido, tmdbId: 12.5 },
    { ...favoritoValido, tmdbId: '550' },
    { ...favoritoValido, tmdbId: undefined },
    { ...favoritoValido, tipo: 'anime' },
    { ...favoritoValido, tipo: '' },
    { ...favoritoValido, tipo: undefined },
    { ...favoritoValido, titulo: '' },
    { ...favoritoValido, titulo: '   ' },
    { ...favoritoValido, titulo: 12345 },
    { ...favoritoValido, titulo: 'A'.repeat(301) },
    { ...favoritoValido, poster: 123 },
  ]

  for (const body of casos) {
    const res = await consultar('favoritos', 'POST', { body })
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(typeof (await res.json()).error, 'string')
  }

  for (const raw of ['[]', '"texto"', 'null', '123']) {
    const res = await consultar('favoritos', 'POST', { raw })
    assert.equal(res.status, 400, raw)
  }
  sinLlamadasAPrisma()
})

test('POST /api/favoritos con JSON mal formado responde 400 sin registrar el cuerpo en el log', async (t) => {
  const log = t.mock.method(console, 'error', () => {})
  const res = await consultar('favoritos', 'POST', {
    raw: '{"tmdbId": 550, "titulo": "incompleto"',
  })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: 'El cuerpo de la petición no es un JSON válido.' })
  assert.equal(log.mock.callCount(), 0)
  sinLlamadasAPrisma()
})

test('POST /api/favoritos con un cuerpo mayor a 10kb responde 413 sin registrarlo', async (t) => {
  const log = t.mock.method(console, 'error', () => {})
  const res = await consultar('favoritos', 'POST', {
    body: { ...favoritoValido, extra: 'X'.repeat(20_000) },
  })
  assert.equal(res.status, 413)
  assert.deepEqual(await res.json(), { error: 'El cuerpo de la petición es demasiado grande.' })
  assert.equal(log.mock.callCount(), 0)
  sinLlamadasAPrisma()
})

// Favoritos: GET /api/favoritos

test('GET /api/favoritos devuelve solo los favoritos del usuario autenticado del más reciente al más antiguo', async () => {
  const res = await consultar('favoritos', 'GET', {
    query: '?usuarioId=usuario-b',
    headers: { 'X-User-Id': 'usuario-b' },
  })
  assert.equal(res.status, 200)
  const body = await res.json()

  assert.deepEqual(body.resultados.map((r) => r.tmdbId), [680, 1396, 550])
  assert.deepEqual(body.paginacion, { pagina: 1, limite: 20, total: 3, totalPaginas: 1 })
  assert.ok(body.resultados.every((r) => !('usuarioId' in r)))

  const { where, orderBy } = favFindMany.mock.calls[0].arguments[0]
  assert.deepEqual(where, { usuarioId: 'usuario-a' })
  assert.deepEqual(orderBy, [{ creadoEn: 'desc' }, { id: 'desc' }])
})

test('GET /api/favoritos pagina, ordena de forma ascendente y filtra por tipo movie y tv', async () => {
  const pagina2 = await (
    await consultar('favoritos', 'GET', { query: '?limite=2&pagina=2' })
  ).json()
  assert.deepEqual(pagina2.resultados.map((r) => r.tmdbId), [550])
  assert.deepEqual(pagina2.paginacion, { pagina: 2, limite: 2, total: 3, totalPaginas: 2 })

  const asc = await (
    await consultar('favoritos', 'GET', { query: '?orden=asc&limite=1' })
  ).json()
  assert.equal(asc.resultados[0].tmdbId, 550)

  const peliculas = await (
    await consultar('favoritos', 'GET', { query: '?tipo=movie' })
  ).json()
  assert.equal(peliculas.paginacion.total, 2)
  assert.ok(peliculas.resultados.every((r) => r.tipo === 'movie'))

  const series = await (await consultar('favoritos', 'GET', { query: '?tipo=tv' })).json()
  assert.equal(series.paginacion.total, 1)
  assert.equal(series.resultados[0].tmdbId, 1396)
})

test('GET /api/favoritos con parámetros inválidos responde 400 sin consultar Prisma', async () => {
  const casos = [
    '?pagina=0',
    '?pagina=-1',
    '?pagina=abc',
    '?pagina=1.5',
    '?limite=0',
    '?limite=101',
    '?tipo=documental',
    '?orden=aleatorio',
    '?pagina=1&pagina=2',
  ]

  for (const query of casos) {
    const res = await consultar('favoritos', 'GET', { query })
    assert.equal(res.status, 400, query)
    assert.equal(typeof (await res.json()).error, 'string')
  }
  sinLlamadasAPrisma()
})

// Favoritos: DELETE /api/favoritos/:id

test('DELETE /api/favoritos/:id elimina un favorito propio y responde 204', async () => {
  const idPropio = uuid(1)
  const res = await consultar('favoritos', 'DELETE', { ruta: `/${idPropio}` })

  assert.equal(res.status, 204)
  assert.equal(await res.text(), '')
  assert.ok(!favoritos.some((r) => r.id === idPropio))
})

test('DELETE /api/favoritos/:id responde 404 si el favorito pertenece a otro usuario y no lo borra', async () => {
  const idAjeno = uuid(4)
  const res = await consultar('favoritos', 'DELETE', {
    token: 'token-a',
    ruta: `/${idAjeno}`,
  })

  assert.equal(res.status, 404)
  assert.deepEqual(await res.json(), { error: 'Ese favorito no existe.' })
  assert.ok(favoritos.some((r) => r.id === idAjeno))
})

test('DELETE /api/favoritos/:id responde 404 si el ID no es un UUID válido o no existe', async () => {
  for (const ruta of ['/no-es-uuid', `/${uuid(999)}`]) {
    const res = await consultar('favoritos', 'DELETE', { ruta })
    assert.equal(res.status, 404, ruta)
    assert.deepEqual(await res.json(), { error: 'Ese favorito no existe.' })
  }
  assert.equal(favoritos.length, 4)
})

// Historial: POST /api/historial

test('POST /api/historial crea un registro con 201 usando el usuario del token', async () => {
  const res = await consultar('historial', 'POST', {
    body: {
      ...historialValido,
      usuarioId: 'usuario-b',
      id: 'id-forzado',
    },
  })

  assert.equal(res.status, 201)
  const body = await res.json()
  assert.deepEqual(Object.keys(body).sort(), [
    'calificacion',
    'creadoEn',
    'emocion',
    'id',
    'poster',
    'tipo',
    'titulo',
    'tmdbId',
  ])
  assert.equal(body.emocion, 'happy')
  assert.equal(body.tmdbId, 27205)
  assert.equal(body.tipo, 'movie')
  assert.equal(body.titulo, 'El origen')
  assert.equal(body.poster, '/origen.jpg')
  assert.equal(body.calificacion, 8.8)
  assert.ok(!('usuarioId' in body))

  assert.equal(histCreate.mock.callCount(), 1)
  assert.equal(histCreate.mock.calls[0].arguments[0].data.usuarioId, 'usuario-a')
})

test('POST /api/historial admite poster y calificacion opcionales y permite múltiples entradas del mismo título', async () => {
  const primero = await consultar('historial', 'POST', {
    body: { emocion: 'neutral', tmdbId: 550, tipo: 'movie', titulo: 'El club de la pelea' },
  })
  assert.equal(primero.status, 201)
  const cuerpoPrimero = await primero.json()
  assert.equal(cuerpoPrimero.poster, null)
  assert.equal(cuerpoPrimero.calificacion, null)

  const segundo = await consultar('historial', 'POST', {
    body: {
      emocion: 'surprised',
      tmdbId: 550,
      tipo: 'movie',
      titulo: 'El club de la pelea',
      calificacion: 0,
    },
  })
  assert.equal(segundo.status, 201)
  const cuerpoSegundo = await segundo.json()
  assert.notEqual(cuerpoSegundo.id, cuerpoPrimero.id)
  assert.equal(cuerpoSegundo.calificacion, 0)
})

test('POST /api/historial de un usuario sin registro local responde 409 sin exponer la cadena de conexión', async () => {
  const res = await consultar('historial', 'POST', {
    token: 'token-sin-registro',
    body: historialValido,
  })
  assert.equal(res.status, 409)
  const texto = await res.text()
  assert.ok(texto.includes('POST /api/usuarios'))
  assert.ok(!texto.includes('secreto'))
  assert.equal(historial.length, 4)
})

test('POST /api/historial con datos inválidos responde 400 sin consultar Prisma', async () => {
  const casos = [
    { ...historialValido, emocion: 'contento' },
    { ...historialValido, emocion: undefined },
    { ...historialValido, tmdbId: 0 },
    { ...historialValido, tmdbId: -5 },
    { ...historialValido, tmdbId: '27205' },
    { ...historialValido, tipo: 'serie' },
    { ...historialValido, titulo: '' },
    { ...historialValido, titulo: '   ' },
    { ...historialValido, calificacion: -0.1 },
    { ...historialValido, calificacion: 10.1 },
    { ...historialValido, calificacion: '8.8' },
    { ...historialValido, calificacion: true },
    { ...historialValido, poster: 123 },
  ]

  for (const body of casos) {
    const res = await consultar('historial', 'POST', { body })
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(typeof (await res.json()).error, 'string')
  }

  for (const raw of ['[]', '"texto"', 'null']) {
    const res = await consultar('historial', 'POST', { raw })
    assert.equal(res.status, 400, raw)
  }
  sinLlamadasAPrisma()
})

// Historial: GET /api/historial

test('GET /api/historial devuelve únicamente los registros del usuario autenticado en orden descendente', async () => {
  const res = await consultar('historial', 'GET')
  assert.equal(res.status, 200)
  const body = await res.json()

  assert.deepEqual(body.resultados.map((r) => r.tmdbId), [680, 1396, 550])
  assert.deepEqual(body.paginacion, { pagina: 1, limite: 20, total: 3, totalPaginas: 1 })
  assert.ok(body.resultados.every((r) => !('usuarioId' in r)))

  const { where, orderBy } = histFindMany.mock.calls[0].arguments[0]
  assert.deepEqual(where, { usuarioId: 'usuario-a' })
  assert.deepEqual(orderBy, [{ creadoEn: 'desc' }, { id: 'desc' }])
})

test('GET /api/historial filtra por emocion, tipo y rango de fechas desde/hasta, y pagina resultados', async () => {
  const felices = await (await consultar('historial', 'GET', { query: '?emocion=happy' })).json()
  assert.equal(felices.paginacion.total, 2)
  assert.ok(felices.resultados.every((r) => r.emocion === 'happy'))

  const series = await (await consultar('historial', 'GET', { query: '?tipo=tv' })).json()
  assert.equal(series.paginacion.total, 1)
  assert.equal(series.resultados[0].tmdbId, 1396)

  const rango = await (
    await consultar('historial', 'GET', {
      query: '?desde=2026-10-02T00:00:00.000Z&hasta=2026-10-02T23:59:59.999Z',
    })
  ).json()
  assert.deepEqual(rango.resultados.map((r) => r.emocion), ['sad'])

  const asc = await (
    await consultar('historial', 'GET', { query: '?orden=asc&limite=1&pagina=1' })
  ).json()
  assert.equal(asc.resultados[0].tmdbId, 550)
  assert.deepEqual(asc.paginacion, { pagina: 1, limite: 1, total: 3, totalPaginas: 3 })
})

test('GET /api/historial con query inválida o desde mayor que hasta responde 400 sin consultar Prisma', async () => {
  const casos = [
    '?pagina=0',
    '?pagina=abc',
    '?limite=0',
    '?limite=101',
    '?emocion=alegre',
    '?tipo=podcast',
    '?orden=random',
    '?desde=fecha-invalida',
    '?hasta=no-es-fecha',
    '?desde=2026-10-05T00:00:00.000Z&hasta=2026-10-01T00:00:00.000Z',
    '?emocion=happy&emocion=sad',
  ]

  for (const query of casos) {
    const res = await consultar('historial', 'GET', { query })
    assert.equal(res.status, 400, query)
    assert.equal(typeof (await res.json()).error, 'string')
  }
  sinLlamadasAPrisma()
})

// Historial: DELETE /api/historial/:id

test('DELETE /api/historial/:id elimina un registro propio con 204 y responde 404 si es ajeno o inválido', async () => {
  const idPropio = uuid(5)
  const borrado = await consultar('historial', 'DELETE', { ruta: `/${idPropio}` })
  assert.equal(borrado.status, 204)
  assert.ok(!historial.some((r) => r.id === idPropio))

  const idAjeno = uuid(8)
  const ajeno = await consultar('historial', 'DELETE', {
    token: 'token-a',
    ruta: `/${idAjeno}`,
  })
  assert.equal(ajeno.status, 404)
  assert.deepEqual(await ajeno.json(), { error: 'El registro del historial no existe.' })
  assert.ok(historial.some((r) => r.id === idAjeno))

  for (const ruta of ['/id-invalido', `/${uuid(999)}`]) {
    const inexistente = await consultar('historial', 'DELETE', { ruta })
    assert.equal(inexistente.status, 404, ruta)
    assert.deepEqual(await inexistente.json(), { error: 'El registro del historial no existe.' })
  }
})

// Seguridad ante errores de base de datos y rutas públicas

test('un fallo de Prisma en favoritos o historial responde 500 sin filtrar la cadena de conexión ni en la respuesta ni en console.error', async (t) => {
  const log = t.mock.method(console, 'error', () => {})
  const escenarios = [
    ['favoritos', 'POST', '', favoritoValido, favCreate],
    ['favoritos', 'GET', '', undefined, favFindMany],
    ['favoritos', 'GET', '', undefined, favCount],
    ['favoritos', 'DELETE', `/${uuid(1)}`, undefined, favDeleteMany],
    ['historial', 'POST', '', historialValido, histCreate],
    ['historial', 'GET', '', undefined, histFindMany],
    ['historial', 'GET', '', undefined, histCount],
    ['historial', 'DELETE', `/${uuid(5)}`, undefined, histDeleteMany],
  ]

  for (const [recurso, method, ruta, body, operacion] of escenarios) {
    log.mock.resetCalls()
    operacion.mock.mockImplementationOnce(async () => {
      throw Object.assign(new Error(`Can't reach database server at ${SECRETO}`), { code: 'P1001' })
    })

    const res = await consultar(recurso, method, { ruta, body })
    assert.equal(res.status, 500, `${method} /api/${recurso}${ruta}`)
    const payload = await res.json()
    assert.equal(typeof payload.error, 'string')
    assert.ok(!payload.error.includes('secreto'))
    assert.ok(!payload.error.includes('P1001'))

    assert.equal(log.mock.callCount(), 1)
    const registrado = log.mock.calls[0].arguments.join(' ')
    assert.ok(registrado.includes('P1001'))
    assert.ok(!registrado.includes('secreto'))
  }
})

test('GET /health es público y no invoca Supabase ni Prisma', async () => {
  const res = await fetch(`${baseUrl}/health`)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).status, 'ok')
  assert.equal(getUser.mock.callCount(), 0)
  sinLlamadasAPrisma()
})