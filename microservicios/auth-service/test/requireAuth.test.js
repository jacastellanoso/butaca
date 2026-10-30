import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// Evita cargar el .env local o utilizar credenciales heredadas de la terminal.
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('../.env.example', import.meta.url))
process.env.SUPABASE_URL = ''
process.env.SUPABASE_PUBLISHABLE_KEY = ''

const { createRequireAuth, requireAuth } = await import('../src/middlewares/requireAuth.js')

function createRequest(header) {
  return {
    get: (name) => name === 'authorization' ? header : 'identidad-falsa',
    body: { id: 'identidad-falsa', email: 'falso@example.com' },
    query: { id: 'identidad-falsa' },
  }
}

function createResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('token válido: consulta Supabase y asigna solo id y email verificados', async () => {
  const user = { id: 'usuario-verificado', email: 'usuario@example.com', role: 'authenticated' }
  const getUser = mock.fn(async () => ({ data: { user }, error: null }))
  const middleware = createRequireAuth({ auth: { getUser } })
  const req = createRequest('Bearer token-de-prueba')
  const res = createResponse()
  const next = mock.fn()

  await middleware(req, res, next)

  assert.equal(getUser.mock.callCount(), 1)
  assert.deepEqual(getUser.mock.calls[0].arguments, ['token-de-prueba'])
  assert.deepEqual(req.user, { id: user.id, email: user.email })
  assert.equal(next.mock.callCount(), 1)
  assert.deepEqual(next.mock.calls[0].arguments, [])
  assert.equal(res.statusCode, undefined)
})

for (const header of [undefined, '', 'Bearer', 'Bearer ', 'Basic token', 'Bearer token extra', 'Bearer token\nextra', 'Bearer token\n']) {
  test(`token ausente o formato incorrecto (${JSON.stringify(header)}): responde 401 sin consultar Supabase`, async () => {
    const getUser = mock.fn()
    const middleware = createRequireAuth({ auth: { getUser } })
    const req = createRequest(header)
    const res = createResponse()
    const next = mock.fn()

    await middleware(req, res, next)

    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.body, { error: 'Falta el token de sesión o su formato es incorrecto.' })
    assert.equal(getUser.mock.callCount(), 0)
    assert.equal(next.mock.callCount(), 0)
    assert.equal(req.user, undefined)
  })
}

for (const status of [400, 401, 403, 404, 422]) {
  test(`Supabase rechaza el token (${status}): responde 401 sin filtrar el error`, async () => {
    const getUser = mock.fn(async () => ({
      data: { user: null }, error: { status, message: 'detalle privado' },
    }))
    const req = createRequest('Bearer token-invalido')
    const res = createResponse()
    const next = mock.fn()

    await createRequireAuth({ auth: { getUser } })(req, res, next)

    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.body, { error: 'Sesión inválida o expirada.' })
    assert.equal(req.user, undefined)
    assert.equal(next.mock.callCount(), 0)
  })
}

test('Supabase no devuelve un usuario: responde 401', async () => {
  const getUser = mock.fn(async () => ({ data: { user: null }, error: null }))
  const req = createRequest('Bearer token-de-prueba')
  const res = createResponse()
  const next = mock.fn()

  await createRequireAuth({ auth: { getUser } })(req, res, next)

  assert.equal(res.statusCode, 401)
  assert.deepEqual(res.body, { error: 'Sesión inválida o expirada.' })
  assert.equal(req.user, undefined)
  assert.equal(next.mock.callCount(), 0)
})

test('Supabase sin configurar: la instancia reutilizable responde 500', async () => {
  const req = createRequest('Bearer token-de-prueba')
  const res = createResponse()
  const next = mock.fn()

  await requireAuth(req, res, next)

  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'El servicio de autenticación no está configurado.' })
  assert.equal(req.user, undefined)
  assert.equal(next.mock.callCount(), 0)
})

for (const status of [0, 429, 500, 503, undefined]) {
  test(`fallo de Supabase (${status}): responde 503 sin filtrar el error`, async () => {
    const getUser = mock.fn(async () => ({
      data: { user: null }, error: { status, message: 'detalle privado' },
    }))
    const req = createRequest('Bearer token-de-prueba')
    const res = createResponse()
    const next = mock.fn()

    await createRequireAuth({ auth: { getUser } })(req, res, next)

    assert.equal(res.statusCode, 503)
    assert.deepEqual(res.body, { error: 'El servicio de autenticación no está disponible. Intentá de nuevo.' })
    assert.equal(req.user, undefined)
    assert.equal(next.mock.callCount(), 0)
  })
}

test('excepción de red: responde 503 sin filtrar detalles ni llamar next', async () => {
  const getUser = mock.fn(async () => { throw new Error('detalle privado de la red') })
  const req = createRequest('Bearer token-de-prueba')
  const res = createResponse()
  const next = mock.fn()

  await createRequireAuth({ auth: { getUser } })(req, res, next)

  assert.equal(res.statusCode, 503)
  assert.deepEqual(res.body, { error: 'El servicio de autenticación no está disponible. Intentá de nuevo.' })
  assert.equal(req.user, undefined)
  assert.equal(next.mock.callCount(), 0)
})
