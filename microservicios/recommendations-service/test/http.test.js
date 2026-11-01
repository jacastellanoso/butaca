import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'

// Pruebas sin secretos. El modo contenedor requiere publicar solo en loopback.
process.env.DOTENV_CONFIG_PATH = 'NUL'
const { crearApp } = await import('../src/app.js')
const animoId = '12345678-1234-1234-1234-123456789abc'

test('contratos sobre HTTP con dependencias simuladas', async (t) => {
  const containerUrl = process.env.PF15_TEST_CONTAINER_URL
  let mode = 'ok'
  const calls = []
  const upstream = createServer((req, res) => {
    const url = new URL(req.url, 'http://local.test')
    calls.push({ path: url.pathname, authorization: req.headers.authorization })
    res.setHeader('Content-Type', 'application/json')
    const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)) }
    if (url.pathname === '/api/sesiones') {
      if (mode === 'auth-timeout') return
      if (mode === 'auth-invalid') return send(401, { error: 'rechazado' })
      if (mode === 'auth-unavailable') return send(503, {})
      if (mode === 'redirect') {
        res.writeHead(302, { Location: '/token-no-debe-llegar' }); return res.end()
      }
      return send(200, { id: 'usuario-ficticio', email: null })
    }
    if (url.pathname === `/api/animos/${animoId}`) {
      if (mode === 'animo-ajeno') return send(404, {})
      return send(200, { id: animoId, emocion: 'sad', consentimientoHistorial: mode !== 'sin-consentimiento' })
    }
    if (url.pathname === '/api/catalogo') {
      if (mode === 'body-timeout') { res.writeHead(200); res.write('{'); return }
      if (mode === 'catalog-invalid-json') return res.end('{')
      if (mode === 'catalog-invalid-shape') return send(200, { resultados: {} })
      if (mode === 'catalog-unavailable' || (mode === 'partial' && url.searchParams.get('categoria') === 'Acción')) return send(503, {})
      const tipo = url.searchParams.get('tipo')
      return send(200, { fuente: 'tmdb', resultados: mode === 'empty' ? [] : [{
        tmdbId: 42, tipoTmdb: tipo, titulo: 'Contenido de prueba HTTP', descripcion: '',
        poster: null, fecha: null, calificacion: null, esDemostracion: false,
      }] })
    }
    send(404, {})
  })
  upstream.listen(containerUrl ? 39095 : 0, containerUrl ? '0.0.0.0' : '127.0.0.1')
  await once(upstream, 'listening')
  t.after(() => new Promise((resolve) => { upstream.close(resolve); upstream.closeAllConnections() }))
  const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`
  let baseUrl = containerUrl
  if (!containerUrl) {
    const server = crearApp({ config: {
      serviceName: 'recommendations-service', authServiceUrl: upstreamUrl,
      emotionsServiceUrl: upstreamUrl, catalogServiceUrl: upstreamUrl,
      requestTimeoutMs: 700, upstreamTimeoutMs: 200,
    } }).listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
    baseUrl = `http://127.0.0.1:${server.address().port}`
  }
  const request = async (query, token = 'Bearer prueba-ficticia') => {
    const response = await fetch(`${baseUrl}/api/recomendaciones?${query}`, {
      headers: token ? { Authorization: token } : {},
    })
    assert.match(response.headers.get('content-type'), /application\/json/)
    return { status: response.status, body: await response.json() }
  }
  await t.test('health público', async () => {
    const response = await fetch(`${baseUrl}/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { status: 'ok', service: 'recommendations-service' })
  })
  await t.test('movie por emoción y autenticación HTTP', async () => {
    const { status, body } = await request('emocion=happy')
    assert.equal(status, 200)
    assert.equal(body.fuente, 'tmdb')
    assert.equal(body.resultados.length, 1)
    assert.equal(body.resultados[0].tipo, 'movie')
    assert.equal(calls[0].authorization, 'Bearer prueba-ficticia')
    assert.ok(calls.filter((call) => call.path === '/api/catalogo').every((call) => !call.authorization))
  })
  await t.test('TV por ánimo con Bearer reenviado', async () => {
    const { status, body } = await request(`animoId=${animoId}&tipo=tv`)
    assert.equal(status, 200)
    assert.equal(body.emocion, 'sad')
    assert.equal(body.resultados[0].tipo, 'tv')
    assert.equal(calls.find((call) => call.path.startsWith('/api/animos/')).authorization, 'Bearer prueba-ficticia')
  })
  await t.test('sin sesión', async () => assert.equal((await request('emocion=happy', null)).status, 401))
  await t.test('validación de parámetros', async () => assert.equal((await request('emocion=happy&tipo=tv&tipo=movie')).status, 400))
  for (const [scenario, expected, query = 'emocion=happy'] of [
    ['auth-invalid', 401], ['auth-unavailable', 503], ['redirect', 503],
    ['animo-ajeno', 404, `animoId=${animoId}`], ['sin-consentimiento', 404, `animoId=${animoId}`],
    ['catalog-invalid-json', 502], ['catalog-invalid-shape', 502],
    ['catalog-unavailable', 503], ['partial', 503], ['auth-timeout', 503], ['body-timeout', 503],
  ]) {
    await t.test(scenario, async () => {
      mode = scenario
      const start = performance.now()
      const { status, body } = await request(query)
      assert.equal(status, expected)
      assert.equal(typeof body.error, 'string')
      assert.ok(!Object.hasOwn(body, 'resultados'))
      assert.ok(performance.now() - start < 4500)
    })
  }
  await t.test('catálogo vacío', async () => {
    mode = 'empty'
    assert.deepEqual((await request('emocion=happy')).body, {
      emocion: 'happy', tipo: 'movie', fuente: 'tmdb', resultados: [],
    })
  })
  assert.ok(!calls.some((call) => call.path === '/token-no-debe-llegar'))
})
