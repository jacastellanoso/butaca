import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buscarSecretos, esArchivoDeSecretos } from './detectores.js'

const jwt = (payload) =>
  ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'firmafalsafirmafalsa'].join('.')

test('detecta una clave secreta de Supabase', () => {
  // Ejemplo sintético de prueba para comprobar la detección del prefijo sb_secret_
  const [hallazgo] = buscarSecretos('SUPABASE_KEY=sb_secret_AbCdEfGhIjKlMnOpQrSt')
  assert.match(hallazgo.tipo, /Supabase/)
  assert.equal(hallazgo.linea, 1)
  assert.doesNotMatch(hallazgo.valor, /MnOpQrSt/) // el valor sale enmascarado
})

test('la clave publicable de Supabase no es un secreto', () => {
  assert.deepEqual(buscarSecretos('VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AbCdEfGhIjKlMnOp'), [])
})

test('detecta JWT service_role y tokens de TMDB, pero no un JWT cualquiera', () => {
  assert.equal(buscarSecretos(jwt({ role: 'service_role' })).length, 1)
  assert.equal(buscarSecretos(jwt({ aud: 'abc', scopes: ['api_read'] })).length, 1)
  assert.equal(buscarSecretos(jwt({ role: 'authenticated', sub: 'usuario' })).length, 0)
})

test('detecta una cadena de PostgreSQL ficticia con clave e ignora las de ejemplo', () => {
  // Ejemplo sintético de prueba con contraseña que no coincide con placeholders para verificar el detector:
  const ejemploFicticioConClave = 'DATABASE_URL="postgresql://postgres.abcd:Cl4veReal!@aws-0-us-east-1.pooler.supabase.com:6543/postgres"'
  assert.equal(buscarSecretos(ejemploFicticioConClave).length, 1)

  for (const ejemplo of [
    'postgresql://postgres.abcd:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
    'postgresql://build:build@localhost:5432/build',
    'postgresql://test:test@database.invalid:5432/test',
    'postgresql://secreto:clave@127.0.0.1:5432/base',
    'postgresql://secreto:clave@privado.supabase.com/base', // la usan las pruebas de emotions y library
  ]) {
    assert.deepEqual(buscarSecretos(ejemplo), [], ejemplo)
  }
})

test('detecta una API key de TMDB asignada y una llave privada', () => {
  // Ejemplos sintéticos de prueba:
  assert.equal(buscarSecretos('TMDB_API_KEY=b3e7a06d85c97108194829ca46b85e85').length, 1)
  assert.deepEqual(buscarSecretos('TMDB_API_KEY='), [])
  assert.equal(buscarSecretos('-----BEGIN PRIVATE KEY-----').length, 1)

  // En modo ignorarEjemplosDePrueba los ejemplos sintéticos de test se omiten para CI:
  assert.equal(buscarSecretos('TMDB_API_KEY=b3e7a06d85c97108194829ca46b85e85', { ignorarEjemplosDePrueba: true }).length, 0)
  assert.equal(buscarSecretos('assert.equal(buscarSecretos("-----BEGIN PRIVATE KEY-----").length, 1)', { ignorarEjemplosDePrueba: true }).length, 0)
})

test('.env y .env.local son de secretos; .env.example no', () => {
  assert.equal(esArchivoDeSecretos('microservicios/auth-service/.env'), true)
  assert.equal(esArchivoDeSecretos('.env.local'), true)
  assert.equal(esArchivoDeSecretos('.env.example'), false)
  assert.equal(esArchivoDeSecretos('src/lib/env.js'), false)
})
