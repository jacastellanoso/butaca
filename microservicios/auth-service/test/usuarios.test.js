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
const usuarioSelect = { id: true, email: true, creadoEn: true }
const creadoEn = new Date('2026-10-01T12:00:00.000Z')
const ajeno = { id: 'usuario-b', email: 'b@example.com', creadoEn }
let registros

const getUser = mock.method(supabase.auth, 'getUser', async (token) => {
  if (token === 'token-a' || token === 'sin-correo') {
    return { data: { user: { id: 'usuario-a', email: token === 'sin-correo' ? undefined : 'a@example.com' } }, error: null }
  }
  if (token === 'token-b') return { data: { user: ajeno }, error: null }
  return { data: { user: null }, error: { status: 401, message: 'detalle privado' } }
})

function seleccionar(usuario, select) {
  return Object.fromEntries(Object.keys(select).map((key) => [key, usuario[key]]))
}

// El delegado de Prisma es un Proxy: sus métodos no tienen descriptor.value
// para mock.method(). Sustituirlo completo evita invocar métodos reales.
const originalUsuario = prisma.usuario
const upsert = mock.fn(async ({ where, create, update, select }) => {
  const actual = registros.get(where.id)
  const usuario = actual ? { ...actual, ...update } : { ...create, creadoEn }
  registros.set(where.id, usuario)
  return seleccionar(usuario, select)
})
const findUnique = mock.fn(async ({ where, select }) => {
  const usuario = registros.get(where.id)
  return usuario ? seleccionar(usuario, select) : null
})
prisma.usuario = { upsert, findUnique }
const { app } = await import('../src/app.js')
let server
let baseUrl

before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

beforeEach(() => {
  registros = new Map([['usuario-b', { ...ajeno }]])
  getUser.mock.resetCalls()
  upsert.mock.resetCalls()
  findUnique.mock.resetCalls()
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
    prisma.usuario = originalUsuario
  }
})

function consultar(method, { token = 'token-a', body, query = '', headers = {} } = {}) {
  return fetch(`${baseUrl}/api/usuarios${query}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

test('POST crea solo la identidad verificada e ignora body, query y headers personalizados', async () => {
  const res = await consultar('POST', {
    body: { id: 'usuario-b', email: 'atacante@example.com', creadoEn: '2000-01-01', animos: [], favoritos: [] },
    query: '?id=usuario-b&email=atacante@example.com',
    headers: { 'X-User-Id': 'usuario-b', 'X-User-Email': 'atacante@example.com' },
  })

  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { id: 'usuario-a', email: 'a@example.com', creadoEn: creadoEn.toISOString() })
  assert.equal(upsert.mock.callCount(), 1)
  assert.deepEqual(upsert.mock.calls[0].arguments, [{
    where: { id: 'usuario-a' }, create: { id: 'usuario-a', email: 'a@example.com' },
    update: { email: 'a@example.com' }, select: usuarioSelect,
  }])
  assert.deepEqual(registros.get('usuario-b'), ajeno)
  assert.equal(findUnique.mock.callCount(), 0)
})

test('POST repetido sincroniza únicamente el correo sin duplicar ni modificar fecha o relaciones', async () => {
  const anterior = new Date('2025-01-01T00:00:00.000Z')
  const animos = [{ id: 'animo-1' }]
  const favoritos = [{ id: 'favorito-1' }]
  registros.set('usuario-a', { id: 'usuario-a', email: 'anterior@example.com', creadoEn: anterior, animos, favoritos })

  for (let intento = 0; intento < 2; intento++) {
    const res = await consultar('POST')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { id: 'usuario-a', email: 'a@example.com', creadoEn: anterior.toISOString() })
  }

  assert.equal(registros.size, 2)
  assert.deepEqual(registros.get('usuario-a'), { id: 'usuario-a', email: 'a@example.com', creadoEn: anterior, animos, favoritos })
  for (const call of upsert.mock.calls) {
    assert.deepEqual(call.arguments[0].update, { email: 'a@example.com' })
    assert.deepEqual(call.arguments[0].select, usuarioSelect)
  }
})

test('POST admite correo ausente como null al crear y al actualizar', async () => {
  for (let intento = 0; intento < 2; intento++) {
    if (intento === 1) registros.get('usuario-a').email = 'anterior@example.com'
    const res = await consultar('POST', { token: 'sin-correo', body: { email: 'no-confiable@example.com' } })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { id: 'usuario-a', email: null, creadoEn: creadoEn.toISOString() })
  }
  assert.equal(registros.size, 2)
})

test('GET consulta solo al autenticado e ignora id ajeno en query y headers', async () => {
  registros.set('usuario-a', { id: 'usuario-a', email: 'a@example.com', creadoEn, animos: [], favoritos: [] })
  const snapshot = structuredClone([...registros])
  const res = await consultar('GET', { query: '?id=usuario-b', headers: { 'X-User-Id': 'usuario-b' } })

  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { id: 'usuario-a', email: 'a@example.com', creadoEn: creadoEn.toISOString() })
  assert.equal(findUnique.mock.callCount(), 1)
  assert.deepEqual(findUnique.mock.calls[0].arguments, [{ where: { id: 'usuario-a' }, select: usuarioSelect }])
  assert.equal(upsert.mock.callCount(), 0)
  assert.deepEqual([...registros], snapshot)
})

test('GET sin registro local responde 404 y no devuelve ni modifica al usuario ajeno', async () => {
  const res = await consultar('GET', { query: '?id=usuario-b' })
  assert.equal(res.status, 404)
  assert.deepEqual(await res.json(), { error: 'El usuario autenticado no tiene un registro local.' })
  assert.equal(upsert.mock.callCount(), 0)
  assert.equal(registros.size, 1)
  assert.deepEqual(registros.get('usuario-b'), ajeno)
})

test('cada token consulta y sincroniza su propio usuario', async () => {
  const res = await consultar('POST', { token: 'token-b', body: { id: 'usuario-a' } })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ...ajeno, creadoEn: creadoEn.toISOString() })
  assert.equal(registros.has('usuario-a'), false)
  const consulta = await consultar('GET', { token: 'token-b', query: '?id=usuario-a' })
  assert.equal(consulta.status, 200)
  assert.deepEqual(await consulta.json(), { ...ajeno, creadoEn: creadoEn.toISOString() })
  assert.deepEqual(findUnique.mock.calls[0].arguments[0].where, { id: 'usuario-b' })
})

for (const method of ['GET', 'POST']) {
  for (const token of [null, 'rechazado']) {
    test(`${method} sin autenticación válida (${token}): 401 sin consultar Prisma`, async () => {
      const res = await consultar(method, { token })
      assert.equal(res.status, 401)
      assert.deepEqual(await res.json(), { error: token ? 'Sesión inválida o expirada.' : 'Falta el token de sesión o su formato es incorrecto.' })
      assert.equal(upsert.mock.callCount(), 0)
      assert.equal(findUnique.mock.callCount(), 0)
    })
  }

  test(`${method} ante fallo de persistencia responde 500 sin exponer ni registrar detalles`, async (t) => {
    const log = t.mock.method(console, 'error', () => {})
    const operation = method === 'POST' ? upsert : findUnique
    operation.mock.mockImplementationOnce(async () => { throw new Error('postgresql://secreto@privado/base') })
    const res = await consultar(method)

    assert.equal(res.status, 500)
    assert.deepEqual(await res.json(), { error: method === 'POST'
      ? 'No se pudo guardar el usuario. Intentá de nuevo.'
      : 'No se pudo consultar el usuario. Intentá de nuevo.' })
    assert.equal(log.mock.callCount(), 0)
    assert.deepEqual(registros.get('usuario-b'), ajeno)
  })
}

test('/health permanece público y /api/sesiones conserva la identidad sin acceder a Prisma', async () => {
  const health = await fetch(`${baseUrl}/health`)
  assert.equal(health.status, 200)
  assert.equal((await health.json()).status, 'ok')
  assert.equal(getUser.mock.callCount(), 0)

  const sesion = await fetch(`${baseUrl}/api/sesiones`, { headers: { Authorization: 'Bearer token-a' } })
  assert.equal(sesion.status, 200)
  assert.deepEqual(await sesion.json(), { id: 'usuario-a', email: 'a@example.com' })
  assert.equal(upsert.mock.callCount(), 0)
  assert.equal(findUnique.mock.callCount(), 0)
})
