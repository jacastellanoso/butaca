import assert from 'node:assert/strict'
import { after, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// Configuración ficticia: no se carga el .env local ni se usan credenciales reales.
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('../.env.example', import.meta.url))
process.env.SUPABASE_URL = 'https://supabase.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only'

const { supabase } = await import('../src/lib/supabase.js')
const getUser = mock.method(supabase.auth, 'getUser', async (token) => {
  if (token === 'token-valido') {
    return {
      data: { user: { id: 'usuario-verificado', email: 'usuario@example.com', role: 'authenticated' } },
      error: null,
    }
  }

  return { data: { user: null }, error: { status: 401, message: 'detalle privado' } }
})
const { app } = await import('../src/app.js')

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
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
  }
})

test('GET /api/sesiones devuelve solo la identidad verificada e ignora identidades enviadas', async () => {
  const callsBefore = getUser.mock.callCount()
  const res = await fetch(`${baseUrl}/api/sesiones?id=identidad-falsa&email=falso@example.com`, {
    headers: { Authorization: 'Bearer token-valido', 'X-User-Id': 'identidad-falsa' },
  })

  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /application\/json/)
  assert.deepEqual(await res.json(), { id: 'usuario-verificado', email: 'usuario@example.com' })
  assert.equal(getUser.mock.callCount(), callsBefore + 1)
  assert.deepEqual(getUser.mock.calls.at(-1).arguments, ['token-valido'])
})

test('GET /api/sesiones sin token reutiliza el 401 del middleware', async () => {
  const callsBefore = getUser.mock.callCount()
  const res = await fetch(`${baseUrl}/api/sesiones`)

  assert.equal(res.status, 401)
  assert.deepEqual(await res.json(), { error: 'Falta el token de sesión o su formato es incorrecto.' })
  assert.equal(getUser.mock.callCount(), callsBefore)
})

test('GET /api/sesiones con formato incorrecto reutiliza el 401 del middleware', async () => {
  const callsBefore = getUser.mock.callCount()
  const res = await fetch(`${baseUrl}/api/sesiones`, {
    headers: { Authorization: 'Basic token-valido' },
  })

  assert.equal(res.status, 401)
  assert.deepEqual(await res.json(), { error: 'Falta el token de sesión o su formato es incorrecto.' })
  assert.equal(getUser.mock.callCount(), callsBefore)
})

test('GET /api/sesiones con token rechazado reutiliza el 401 del middleware', async () => {
  const callsBefore = getUser.mock.callCount()
  const res = await fetch(`${baseUrl}/api/sesiones`, {
    headers: { Authorization: 'Bearer token-invalido' },
  })

  assert.equal(res.status, 401)
  assert.deepEqual(await res.json(), { error: 'Sesión inválida o expirada.' })
  assert.equal(getUser.mock.callCount(), callsBefore + 1)
  assert.deepEqual(getUser.mock.calls.at(-1).arguments, ['token-invalido'])
})

test('GET /health sigue público y no consulta Supabase', async () => {
  const callsBefore = getUser.mock.callCount()
  const res = await fetch(`${baseUrl}/health`)

  assert.equal(res.status, 200)
  assert.equal((await res.json()).status, 'ok')
  assert.equal(getUser.mock.callCount(), callsBefore)
})

test('POST /api/sesiones no agrega una operación fuera del alcance', async () => {
  const callsBefore = getUser.mock.callCount()
  const res = await fetch(`${baseUrl}/api/sesiones`, { method: 'POST' })

  assert.equal(res.status, 404)
  assert.equal(typeof (await res.json()).error, 'string')
  assert.equal(getUser.mock.callCount(), callsBefore)
})
