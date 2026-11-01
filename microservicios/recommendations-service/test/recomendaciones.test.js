import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createServer } from 'node:http'

process.env.DOTENV_CONFIG_PATH = 'NUL'
const { crearApp } = await import('../src/app.js')
const id = '12345678-1234-1234-1234-123456789abc'
const config = {
  serviceName: 'recommendations-service', authServiceUrl: 'http://auth.test',
  emotionsServiceUrl: 'http://emotions.test', catalogServiceUrl: 'http://catalog.test',
  requestTimeoutMs: 1000, upstreamTimeoutMs: 500,
}
const item = (tmdbId = 1, tipoTmdb = 'movie', calificacion = 8) => ({
  tmdbId, tipoTmdb, titulo: `Título ${tmdbId}`, descripcion: '', poster: null,
  fecha: null, calificacion, esDemostracion: false,
})
const json = (body, status = 200) => Response.json(body, { status })

async function fixture(t, handler, overrides = {}) {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, ...options })
    const response = handler && await handler(url, options)
    if (response) return response
    if (url.hostname === 'auth.test') return json({ id: 'user-a', email: null })
    if (url.hostname === 'emotions.test') return json({ id, emocion: 'sad', consentimientoHistorial: true })
    return json({ fuente: 'tmdb', resultados: [item(1, url.searchParams.get('tipo'))] })
  }
  const server = crearApp({ config: { ...config, ...overrides }, fetchImpl }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  return { calls, request: async (query = 'emocion=happy', token = 'Bearer valid') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/recomendaciones?${query}`, {
      headers: token === null ? {} : { Authorization: token },
    })
    return { response, body: await response.json() }
  } }
}

for (const token of [null, 'Basic token', 'Bearer', 'Bearer one two']) {
  test(`credencial inválida ${token}`, async (t) => {
    const f = await fixture(t)
    assert.equal((await f.request('emocion=happy', token)).response.status, 401)
    assert.equal(f.calls.length, 0)
  })
}

test('sesión rechazada no consulta datos', async (t) => {
  const f = await fixture(t, () => json({ error: 'privado' }, 401))
  assert.equal((await f.request()).response.status, 401)
  assert.equal(f.calls.length, 1)
})

for (const [emocion, categorias] of Object.entries({
  happy: ['Comedia', 'Acción'], sad: ['Comedia', 'Animación'], angry: ['Acción', 'Comedia'],
  fearful: ['Comedia', 'Animación'], disgusted: ['Acción', 'Ciencia ficción'],
  surprised: ['Ciencia ficción', 'Terror'], neutral: ['Drama', 'Acción'],
})) {
  test(`mapeo y contrato ${emocion}`, async (t) => {
    const f = await fixture(t)
    const { response, body } = await f.request(`emocion=${emocion}`)
    assert.equal(response.status, 200)
    assert.deepEqual(f.calls.slice(1).map((call) => call.url.searchParams.get('categoria')), categorias)
    assert.equal(f.calls[0].headers.Authorization, 'Bearer valid')
    assert.ok(f.calls.slice(1).every((call) => !call.headers.Authorization && call.redirect === 'error'))
    assert.deepEqual(body, { emocion, tipo: 'movie', fuente: 'tmdb', resultados: [{
      tmdbId: 1, titulo: 'Título 1', descripcion: '', poster: null, fecha: null, calificacion: 8, tipo: 'movie',
    }] })
    assert.equal(response.headers.get('cache-control'), 'no-store')
  })
}

test('ánimo autorizado y tipo TV', async (t) => {
  const f = await fixture(t)
  const { response, body } = await f.request(`animoId=${id}&tipo=tv`)
  assert.equal(response.status, 200)
  assert.equal(body.emocion, 'sad')
  assert.equal(body.resultados[0].tipo, 'tv')
  assert.equal(f.calls[1].url.pathname, `/api/animos/${id}`)
  assert.equal(f.calls[1].headers.Authorization, 'Bearer valid')
})

test('registro ajeno usa Bearer del solicitante y conserva 404', async (t) => {
  const f = await fixture(t, (url, options) => {
    if (url.hostname === 'emotions.test') {
      assert.equal(options.headers.Authorization, 'Bearer user-b')
      return json({}, 404)
    }
  })
  assert.equal((await f.request(`animoId=${id}`, 'Bearer user-b')).response.status, 404)
  assert.equal(f.calls.length, 2)
})

for (const consentimientoHistorial of [false, undefined]) {
  test(`consentimiento ${consentimientoHistorial}`, async (t) => {
    const f = await fixture(t, (url) => url.hostname === 'emotions.test' && json({ id, emocion: 'sad', consentimientoHistorial }))
    assert.equal((await f.request(`animoId=${id}`)).response.status, consentimientoHistorial === false ? 404 : 502)
    assert.equal(f.calls.length, 2)
  })
}

for (const query of ['', `emocion=happy&animoId=${id}`, 'emocion=no', 'emocion=',
  'animoId=no', 'tipo=movie', 'emocion=happy&tipo=all', 'emocion=happy&tipo=tv&tipo=movie',
  'emocion=happy&emocion=sad', `animoId=${id}&animoId=${id}`,
  'emocion=happy&usuarioId=otro', 'emocion=happy&emocion[x]=sad']) {
  test(`parámetros inválidos ${query}`, async (t) => {
    const f = await fixture(t)
    assert.equal((await f.request(query)).response.status, 400)
    assert.equal(f.calls.length, 1)
  })
}

test('deduplicación, prioridad, calificación, desempate y máximo veinte', async (t) => {
  const f = await fixture(t, (url) => {
    if (url.hostname !== 'catalog.test') return
    return json({ fuente: 'tmdb', resultados: url.searchParams.get('categoria') === 'Comedia'
      ? [item(3), item(2), item(1, 'movie', 9)]
      : [item(1), ...Array.from({ length: 30 }, (_, i) => item(i + 4))].reverse() })
  })
  const { body } = await f.request()
  assert.equal(body.resultados.length, 20)
  assert.deepEqual(body.resultados.slice(0, 4).map((x) => x.tmdbId), [1, 2, 3, 4])
  assert.equal(new Set(body.resultados.map((x) => x.tmdbId)).size, 20)
})

test('vacío válido sin sustitutos', async (t) => {
  const f = await fixture(t, (url) => url.hostname === 'catalog.test' && json({ fuente: 'tmdb', resultados: [] }))
  const { response, body } = await f.request()
  assert.equal(response.status, 200)
  assert.deepEqual(body.resultados, [])
})

test('calificación null del catálogo es válida y se ordena al final', async (t) => {
  const f = await fixture(t, (url) => url.hostname === 'catalog.test' && json({
    fuente: 'tmdb', resultados: [item(1, 'movie', null), item(2, 'movie', 0)],
  }))
  const { response, body } = await f.request()
  assert.equal(response.status, 200)
  assert.deepEqual(body.resultados.map((x) => x.tmdbId), [2, 1])
  assert.equal(body.resultados[1].calificacion, null)
})

test('rechaza contenido de demostración', async (t) => {
  const f = await fixture(t, (url) => url.hostname === 'catalog.test' && json({
    fuente: 'tmdb', resultados: [{ ...item(), esDemostracion: true }],
  }))
  assert.equal((await f.request()).response.status, 502)
})

test('ánimo devuelto con otro id es respuesta inválida', async (t) => {
  const f = await fixture(t, (url) => url.hostname === 'emotions.test' && json({
    id: 'otro', emocion: 'sad', consentimientoHistorial: true,
  }))
  assert.equal((await f.request(`animoId=${id}`)).response.status, 502)
})

for (const host of ['auth.test', 'emotions.test', 'catalog.test']) {
  for (const [name, make, status] of [
    ['caído', () => { throw new Error('secreto Bearer valid') }, 503],
    ['503', () => json({ error: 'secreto' }, 503), 503],
    ['JSON roto', () => new Response('{', { headers: { 'Content-Type': 'application/json' } }), 502],
    ['estructura incorrecta', () => json({ secreto: 'privado' }), 502],
    ['HTML', () => new Response('<html>privado</html>'), 502],
  ]) {
    test(`${host}: ${name}`, async (t) => {
      const f = await fixture(t, (url) => url.hostname === host && make())
      const { response, body } = await f.request(`animoId=${id}`)
      assert.equal(response.status, status)
      assert.ok(!JSON.stringify(body).match(/secreto|privado|Bearer/))
    })
  }
}

test('fallo parcial explícito', async (t) => {
  const f = await fixture(t, (url) => url.searchParams.get('categoria') === 'Acción' && json({}, 503))
  const { response, body } = await f.request()
  assert.equal(response.status, 503)
  assert.ok(!Object.hasOwn(body, 'resultados'))
})

test('rechaza tipo de candidato incorrecto', async (t) => {
  const f = await fixture(t, (url) => url.hostname === 'catalog.test' && json({ fuente: 'tmdb', resultados: [item(1, 'tv')] }))
  assert.equal((await f.request()).response.status, 502)
})

for (const mode of ['cabeceras', 'body', 'global']) {
  test(`timeout HTTP real ${mode}`, async (t) => {
    const upstream = createServer((req, res) => {
      if (mode === 'body') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.write('{') }
    }).listen(0, '127.0.0.1')
    await once(upstream, 'listening')
    t.after(() => new Promise((resolve) => { upstream.close(resolve); upstream.closeAllConnections() }))
    const f = await fixture(t, (url, options) => url.hostname === 'auth.test' &&
      fetch(`http://127.0.0.1:${upstream.address().port}`, options), {
      requestTimeoutMs: mode === 'global' ? 80 : 500,
      upstreamTimeoutMs: mode === 'global' ? 500 : 80,
    })
    const start = performance.now()
    assert.equal((await f.request()).response.status, 503)
    assert.ok(performance.now() - start < 1000)
  })
}
