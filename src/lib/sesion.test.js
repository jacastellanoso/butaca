import assert from 'node:assert/strict'
import { test } from 'node:test'

import { validarSesion } from './sesion.js'

// Cliente simulado: solo reproduce las respuestas de supabase.auth.
function cliente({ session = { access_token: 'token-ficticio' }, user = { id: 'u-1' }, errorUser = null, falla = false } = {}) {
  const llamadas = []
  return {
    llamadas,
    auth: {
      async getSession() {
        llamadas.push('getSession')
        if (falla) throw new TypeError('Failed to fetch')
        return { data: { session }, error: null }
      },
      async getUser() {
        llamadas.push('getUser')
        return errorUser ? { data: { user: null }, error: errorUser } : { data: { user }, error: null }
      },
      async signOut(opciones) {
        llamadas.push(`signOut:${opciones?.scope}`)
        return { error: null }
      },
    },
  }
}

test('sin cliente configurado devuelve sin-configuracion', async () => {
  assert.deepEqual(await validarSesion(null), { estado: 'sin-configuracion' })
})

test('sin sesión guardada no consulta al servidor', async () => {
  const c = cliente({ session: null })
  assert.deepEqual(await validarSesion(c), { estado: 'anonimo' })
  assert.deepEqual(c.llamadas, ['getSession'])
})

test('una sesión guardada se valida con getUser antes de aceptarla', async () => {
  const c = cliente()
  assert.deepEqual(await validarSesion(c), { estado: 'autenticado', usuario: { id: 'u-1' } })
  assert.deepEqual(c.llamadas, ['getSession', 'getUser'])
})

test('un token rechazado por Supabase se descarta localmente', async () => {
  const c = cliente({ errorUser: { status: 401, message: 'invalid JWT' } })
  assert.deepEqual(await validarSesion(c), { estado: 'anonimo' })
  assert.deepEqual(c.llamadas, ['getSession', 'getUser', 'signOut:local'])
})

test('un fallo de red no cierra la sesión: devuelve error para reintentar', async () => {
  const c = cliente({ errorUser: { status: 0, message: 'fetch failed' } })
  assert.deepEqual(await validarSesion(c), { estado: 'error' })
  assert.ok(!c.llamadas.some((llamada) => llamada.startsWith('signOut')))
  assert.deepEqual(await validarSesion(cliente({ falla: true })), { estado: 'error' })
})

test('una respuesta sin id de usuario no se acepta', async () => {
  assert.deepEqual(await validarSesion(cliente({ user: {} })), { estado: 'anonimo' })
})
