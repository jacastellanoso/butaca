import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// No cargar .env ni usar credenciales heredadas. Todos los accesos se simulan.
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('../.env.example', import.meta.url))
process.env.SUPABASE_URL = 'https://supabase.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only'
process.env.DATABASE_URL = 'postgresql://test:test@database.invalid:5432/test'
process.env.DIRECT_URL = process.env.DATABASE_URL

const { supabase } = await import('../src/lib/supabase.js')
const { prisma } = await import('../src/lib/prisma.js')
const { CONSENTIMIENTO_HISTORIAL_VERSION } = await import('../src/constants/emociones.js')

const USUARIOS = { 'token-a': 'usuario-a', 'token-b': 'usuario-b', 'token-sin-registro': 'usuario-sin-registro' }
const SECRETO = 'postgresql://secreto:clave@privado.supabase.com/base'
let registros
let usuariosLocales
let secuencia

const getUser = mock.method(supabase.auth, 'getUser', async (token) => {
  if (token === 'token-caida') throw new Error('fetch failed')
  const id = USUARIOS[token]
  if (id) return { data: { user: { id, email: `${id}@example.com` } }, error: null }
  return { data: { user: null }, error: { status: 401, message: 'detalle privado' } }
})

// ── Prisma simulado en memoria ───────────────────────────────────────────
// Implementa solo lo que usa animos.service: filtros, orden, paginación y select.
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function cumple(registro, where) {
  return Object.entries(where).every(([campo, condicion]) => {
    if (campo === 'creadoEn') {
      return (!condicion.gte || registro.creadoEn >= condicion.gte)
        && (!condicion.lte || registro.creadoEn <= condicion.lte)
    }
    return registro[campo] === condicion
  })
}

function seleccionar(registro, select) {
  return Object.fromEntries(Object.keys(select).map((campo) => [campo, registro[campo]]))
}

function ordenar(lista, orderBy) {
  return [...lista].sort((a, b) => {
    for (const criterio of orderBy) {
      const [[campo, sentido]] = Object.entries(criterio)
      if (a[campo] < b[campo]) return sentido === 'asc' ? -1 : 1
      if (a[campo] > b[campo]) return sentido === 'asc' ? 1 : -1
    }
    return 0
  })
}

const create = mock.fn(async ({ data, select }) => {
  if (!usuariosLocales.has(data.usuarioId)) {
    throw Object.assign(new Error(`Foreign key constraint violated: ${SECRETO}`), { code: 'P2003' })
  }
  const registro = { id: uuid(++secuencia), creadoEn: new Date(), ...data }
  registros.push(registro)
  return seleccionar(registro, select)
})
const findMany = mock.fn(async ({ where, orderBy, skip, take, select }) =>
  ordenar(registros.filter((r) => cumple(r, where)), orderBy)
    .slice(skip, skip + take)
    .map((r) => seleccionar(r, select)))
const count = mock.fn(async ({ where }) => registros.filter((r) => cumple(r, where)).length)
const findFirst = mock.fn(async ({ where, select }) => {
  const registro = registros.find((r) => cumple(r, where))
  return registro ? seleccionar(registro, select) : null
})

// El delegado de Prisma es un Proxy: se sustituye completo, como en auth-service.
const originalAnimo = prisma.animo
prisma.animo = { create, findMany, count, findFirst }
const operaciones = [create, findMany, count, findFirst]
const { app } = await import('../src/app.js')

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

function semilla(usuarioId, emocion, fecha, extra = {}) {
  return {
    id: uuid(++secuencia), usuarioId, emocion, confianza: 0.8, origen: 'deteccion',
    consentimientoHistorial: true, consentimientoVersion: CONSENTIMIENTO_HISTORIAL_VERSION,
    consentimientoEn: new Date(fecha), creadoEn: new Date(fecha), ...extra,
  }
}

beforeEach(() => {
  secuencia = 0
  usuariosLocales = new Set(['usuario-a', 'usuario-b'])
  registros = [
    semilla('usuario-a', 'happy', '2026-10-01T10:00:00.000Z'),
    semilla('usuario-a', 'sad', '2026-10-02T10:00:00.000Z'),
    semilla('usuario-a', 'happy', '2026-10-03T10:00:00.000Z', { origen: 'confirmada', confianza: null }),
    // Ánimo previo a pf13: sin evidencia de consentimiento, no forma parte del historial.
    semilla('usuario-a', 'angry', '2026-09-01T10:00:00.000Z', {
      consentimientoHistorial: false, consentimientoVersion: null, consentimientoEn: null,
    }),
    semilla('usuario-b', 'fearful', '2026-10-02T12:00:00.000Z'),
  ]
  getUser.mock.resetCalls()
  for (const operacion of operaciones) operacion.mock.resetCalls()
})

after(async () => {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
    }
  } finally {
    getUser.mock.restore()
    prisma.animo = originalAnimo
  }
})

function consultar(method, { ruta = '', token = 'token-a', body, raw, query = '', headers = {} } = {}) {
  const tieneBody = body !== undefined || raw !== undefined
  return fetch(`${baseUrl}/api/animos${ruta}${query}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tieneBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(tieneBody ? { body: raw ?? JSON.stringify(body) } : {}),
  })
}

const valido = { emocion: 'happy', confianza: 0.89, consentimientoHistorial: true }
const sinLlamadasAPrisma = () => {
  for (const operacion of operaciones) assert.equal(operacion.mock.callCount(), 0)
}

// ── Autenticación ────────────────────────────────────────────────────────

const rutasProtegidas = [
  ['POST', '', valido],
  ['GET', '', undefined],
  ['GET', `/${uuid(1)}`, undefined],
]

for (const [method, ruta, body] of rutasProtegidas) {
  test(`${method} /api/animos${ruta} sin token responde 401 sin consultar Prisma`, async () => {
    const res = await consultar(method, { ruta, token: null, body })
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { error: 'Falta el token de sesión o su formato es incorrecto.' })
    assert.equal(getUser.mock.callCount(), 0)
    sinLlamadasAPrisma()
  })

  test(`${method} /api/animos${ruta} con token inválido responde 401 sin consultar Prisma`, async () => {
    const res = await consultar(method, { ruta, token: 'token-falso', body })
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { error: 'Sesión inválida o expirada.' })
    assert.equal(getUser.mock.callCount(), 1)
    sinLlamadasAPrisma()
  })
}

test('un encabezado Authorization con formato incorrecto responde 401', async () => {
  for (const authorization of ['token-a', 'Basic token-a', 'Bearer', 'Bearer token-a extra']) {
    const res = await consultar('GET', { token: null, headers: { Authorization: authorization } })
    assert.equal(res.status, 401, authorization)
  }
  assert.equal(getUser.mock.callCount(), 0)
  sinLlamadasAPrisma()
})

test('si Supabase no responde se devuelve 503 sin culpar al token', async () => {
  const res = await consultar('POST', { token: 'token-caida', body: valido })
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { error: 'El servicio de autenticación no está disponible. Intentá de nuevo.' })
  sinLlamadasAPrisma()
})

// ── Registro ─────────────────────────────────────────────────────────────

test('POST autorizado guarda con el usuario del token y evidencia de consentimiento', async () => {
  const antes = Date.now()
  const res = await consultar('POST', {
    body: {
      ...valido,
      usuarioId: 'usuario-b',
      id: 'id-elegido',
      creadoEn: '2000-01-01T00:00:00.000Z',
      consentimientoVersion: 'version-falsa',
      imagen: 'data:image/png;base64,AAAA',
    },
    query: '?usuarioId=usuario-b',
    headers: { 'X-User-Id': 'usuario-b' },
  })

  assert.equal(res.status, 201)
  const body = await res.json()
  assert.deepEqual(Object.keys(body).sort(), [
    'confianza', 'consentimientoEn', 'consentimientoHistorial', 'consentimientoVersion',
    'creadoEn', 'emocion', 'id', 'origen',
  ])
  assert.equal(body.emocion, 'happy')
  assert.equal(body.confianza, 0.89)
  assert.equal(body.origen, 'deteccion')
  assert.equal(body.consentimientoHistorial, true)
  assert.equal(body.consentimientoVersion, CONSENTIMIENTO_HISTORIAL_VERSION)
  assert.ok(Date.parse(body.consentimientoEn) >= antes)
  assert.notEqual(body.id, 'id-elegido')
  assert.notEqual(body.creadoEn, '2000-01-01T00:00:00.000Z')

  assert.equal(create.mock.callCount(), 1)
  const { data } = create.mock.calls[0].arguments[0]
  assert.deepEqual(Object.keys(data).sort(), [
    'confianza', 'consentimientoEn', 'consentimientoHistorial', 'consentimientoVersion',
    'emocion', 'origen', 'usuarioId',
  ])
  assert.equal(data.usuarioId, 'usuario-a')
  assert.ok(data.consentimientoEn instanceof Date)
})

test('POST de una emoción confirmada admite confianza ausente y la guarda como null', async () => {
  const res = await consultar('POST', {
    body: { emocion: 'sad', origen: 'confirmada', consentimientoHistorial: true },
  })
  assert.equal(res.status, 201)
  const body = await res.json()
  assert.equal(body.origen, 'confirmada')
  assert.equal(body.confianza, null)
})

test('POST sin autorización explícita para el historial responde 403 y no guarda', async () => {
  const casos = [
    { emocion: 'happy', confianza: 0.89 },
    { ...valido, consentimientoHistorial: false },
    { ...valido, consentimientoHistorial: 'true' },
    { ...valido, consentimientoHistorial: 1 },
    { ...valido, consentimientoHistorial: null },
    // El permiso de cámara o un campo genérico no equivalen a conservar el historial.
    { emocion: 'happy', confianza: 0.89, consentimientoCamara: true },
    { emocion: 'happy', confianza: 0.89, consent: true },
  ]

  for (const body of casos) {
    const res = await consultar('POST', { body })
    assert.equal(res.status, 403, JSON.stringify(body))
    assert.deepEqual(await res.json(), {
      error: 'No se guarda el resultado sin autorización explícita para conservar el historial emocional.',
    })
  }
  sinLlamadasAPrisma()
})

test('POST con datos inválidos responde 400 y no guarda', async () => {
  const casos = [
    { ...valido, emocion: 'feliz' },
    { ...valido, emocion: undefined },
    { ...valido, confianza: 1.5 },
    { ...valido, confianza: -0.1 },
    { ...valido, confianza: '0.89' },
    { ...valido, confianza: undefined },
    { ...valido, confianza: null },
    { ...valido, origen: 'manual' },
    { ...valido, origen: 'confirmada', confianza: 2 },
  ]

  for (const body of casos) {
    const res = await consultar('POST', { body })
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(typeof (await res.json()).error, 'string')
  }

  for (const raw of ['[]', '"texto"', 'null', '{"emocion": "happy",']) {
    const res = await consultar('POST', { raw })
    assert.equal(res.status, 400, raw)
  }
  sinLlamadasAPrisma()
})

test('POST con un body excesivo (por ejemplo una imagen) responde 413 sin registrarlo', async (t) => {
  const log = t.mock.method(console, 'error', () => {})
  const res = await consultar('POST', { body: { ...valido, imagen: 'A'.repeat(20_000) } })
  assert.equal(res.status, 413)
  assert.deepEqual(await res.json(), { error: 'El cuerpo de la petición es demasiado grande.' })
  assert.equal(log.mock.callCount(), 0)
  sinLlamadasAPrisma()
})

test('un JSON mal formado responde 400 sin copiar el body al log', async (t) => {
  const log = t.mock.method(console, 'error', () => {})
  const res = await consultar('POST', { raw: '{"emocion": "sad", "nota": "privada"' })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: 'El cuerpo de la petición no es un JSON válido.' })
  assert.equal(log.mock.callCount(), 0)
})

test('POST de un usuario sin registro local responde 409 sin exponer el error de Prisma', async () => {
  const res = await consultar('POST', { token: 'token-sin-registro', body: valido })
  assert.equal(res.status, 409)
  const texto = await res.text()
  assert.ok(texto.includes('POST /api/usuarios'))
  assert.ok(!texto.includes('secreto'))
  assert.equal(registros.length, 5)
})

// ── Historial ────────────────────────────────────────────────────────────

test('GET devuelve solo el historial autorizado propio, del más reciente al más antiguo', async () => {
  const res = await consultar('GET')
  assert.equal(res.status, 200)
  const body = await res.json()

  assert.deepEqual(body.resultados.map((r) => r.creadoEn), [
    '2026-10-03T10:00:00.000Z', '2026-10-02T10:00:00.000Z', '2026-10-01T10:00:00.000Z',
  ])
  assert.deepEqual(body.paginacion, { pagina: 1, limite: 20, total: 3, totalPaginas: 1 })
  assert.ok(body.resultados.every((r) => r.consentimientoHistorial === true))
  assert.ok(body.resultados.every((r) => !('usuarioId' in r)))

  const { where, orderBy } = findMany.mock.calls[0].arguments[0]
  assert.deepEqual(where, { usuarioId: 'usuario-a', consentimientoHistorial: true })
  assert.deepEqual(orderBy, [{ creadoEn: 'desc' }, { id: 'desc' }])
})

test('GET pagina, ordena de forma ascendente y aplica filtros', async () => {
  const pagina2 = await (await consultar('GET', { query: '?limite=2&pagina=2' })).json()
  assert.deepEqual(pagina2.resultados.map((r) => r.emocion), ['happy'])
  assert.deepEqual(pagina2.paginacion, { pagina: 2, limite: 2, total: 3, totalPaginas: 2 })

  const asc = await (await consultar('GET', { query: '?orden=asc&limite=1' })).json()
  assert.equal(asc.resultados[0].creadoEn, '2026-10-01T10:00:00.000Z')

  const felices = await (await consultar('GET', { query: '?emocion=happy' })).json()
  assert.equal(felices.paginacion.total, 2)
  assert.ok(felices.resultados.every((r) => r.emocion === 'happy'))

  const confirmadas = await (await consultar('GET', { query: '?origen=confirmada' })).json()
  assert.equal(confirmadas.paginacion.total, 1)

  const rango = await (await consultar('GET', {
    query: '?desde=2026-10-02T00:00:00.000Z&hasta=2026-10-02T23:59:59.999Z',
  })).json()
  assert.deepEqual(rango.resultados.map((r) => r.emocion), ['sad'])

  const vacio = await (await consultar('GET', { query: '?pagina=50' })).json()
  assert.deepEqual(vacio.resultados, [])
  assert.equal(vacio.paginacion.total, 3)
})

test('GET con parámetros inválidos responde 400 sin consultar Prisma', async () => {
  const casos = [
    '?pagina=0', '?pagina=abc', '?pagina=1.5', '?limite=0', '?limite=101', '?limite=-1',
    '?emocion=feliz', '?origen=manual', '?orden=random', '?desde=ayer',
    '?desde=2026-10-05T00:00:00Z&hasta=2026-10-01T00:00:00Z', '?pagina=1&pagina=2',
  ]
  for (const query of casos) {
    const res = await consultar('GET', { query })
    assert.equal(res.status, 400, query)
    assert.equal(typeof (await res.json()).error, 'string')
  }
  sinLlamadasAPrisma()
})

test('GET /:id devuelve un registro propio', async () => {
  const res = await consultar('GET', { ruta: `/${uuid(2)}` })
  assert.equal(res.status, 200)
  assert.equal((await res.json()).emocion, 'sad')
})

test('GET /:id responde 404 si el registro no existe, no es válido o no tiene consentimiento', async () => {
  for (const ruta of [`/${uuid(999)}`, '/no-es-un-uuid', `/${uuid(4)}`]) {
    const res = await consultar('GET', { ruta })
    assert.equal(res.status, 404, ruta)
    assert.deepEqual(await res.json(), { error: 'El registro emocional no existe.' })
  }
})

// ── Aislamiento entre usuarios ───────────────────────────────────────────

test('cada usuario ve exclusivamente sus registros aunque pida los de otro', async () => {
  const res = await consultar('GET', {
    token: 'token-b',
    query: '?usuarioId=usuario-a',
    headers: { 'X-User-Id': 'usuario-a' },
  })
  const body = await res.json()
  assert.equal(res.status, 200)
  assert.deepEqual(body.resultados.map((r) => r.emocion), ['fearful'])
  assert.equal(body.paginacion.total, 1)
  assert.equal(findMany.mock.calls[0].arguments[0].where.usuarioId, 'usuario-b')
  assert.equal(count.mock.calls[0].arguments[0].where.usuarioId, 'usuario-b')

  // El registro 1 pertenece a usuario-a: para usuario-b no existe.
  const ajeno = await consultar('GET', { token: 'token-b', ruta: `/${uuid(1)}` })
  assert.equal(ajeno.status, 404)
  assert.deepEqual(findFirst.mock.calls[0].arguments[0].where, {
    id: uuid(1), usuarioId: 'usuario-b', consentimientoHistorial: true,
  })
})

test('un registro guardado por un usuario no aparece en el historial de otro', async () => {
  const creado = await (await consultar('POST', { token: 'token-b', body: { ...valido, usuarioId: 'usuario-a' } })).json()
  const historialA = await (await consultar('GET', { token: 'token-a' })).json()
  assert.ok(!historialA.resultados.some((r) => r.id === creado.id))
  assert.equal((await consultar('GET', { token: 'token-a', ruta: `/${creado.id}` })).status, 404)
  assert.equal((await consultar('GET', { token: 'token-b', ruta: `/${creado.id}` })).status, 200)
})

// ── Errores de base de datos ─────────────────────────────────────────────

const fallos = [
  ['POST', '', valido, create, 'No se pudo guardar el resultado emocional. Intentá de nuevo.'],
  ['GET', '', undefined, findMany, 'No se pudo consultar el historial emocional. Intentá de nuevo.'],
  ['GET', '', undefined, count, 'No se pudo consultar el historial emocional. Intentá de nuevo.'],
  ['GET', `/${uuid(1)}`, undefined, findFirst, 'No se pudo consultar el historial emocional. Intentá de nuevo.'],
]

for (const [method, ruta, body, operacion, mensaje] of fallos) {
  test(`${method} /api/animos${ruta} ante fallo de ${operacion === count ? 'count' : 'Prisma'} responde 500 sin exponer detalles`, async (t) => {
    const log = t.mock.method(console, 'error', () => {})
    operacion.mock.mockImplementationOnce(async () => {
      throw Object.assign(new Error(`Can't reach database server at ${SECRETO}`), { code: 'P1001' })
    })
    const res = await consultar(method, { ruta, body })

    assert.equal(res.status, 500)
    assert.deepEqual(await res.json(), { error: mensaje })
    // Solo el código de Prisma llega al log, nunca el mensaje con la conexión.
    assert.equal(log.mock.callCount(), 1)
    const registrado = log.mock.calls[0].arguments.join(' ')
    assert.ok(registrado.includes('P1001'))
    assert.ok(!registrado.includes('secreto'))
  })
}

// ── Rutas públicas ───────────────────────────────────────────────────────

test('/health es público y no verifica sesiones ni consulta la base', async () => {
  const res = await fetch(`${baseUrl}/health`)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).status, 'ok')
  assert.equal(getUser.mock.callCount(), 0)
  sinLlamadasAPrisma()
})

test('métodos no implementados en /api/animos responden 404 tras autenticar', async () => {
  for (const method of ['PUT', 'DELETE', 'PATCH']) {
    const res = await consultar(method, { ruta: `/${uuid(1)}` })
    assert.equal(res.status, 404, method)
  }
  assert.equal(registros.length, 5)
})
