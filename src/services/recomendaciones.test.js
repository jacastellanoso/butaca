import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFile } from 'node:fs/promises'
import { after, beforeEach, test } from 'node:test'

// Se sustituye solo Supabase. El servicio importa y ejecuta solicitarApi real.
// No se leen variables privadas ni se realizan conexiones externas.
const sessionKey = '__butacaPf18TestSession'
const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (url === new URL('../lib/supabase.js', import.meta.url).href) {
      return {
        format: 'module', shortCircuit: true,
        source: `export const supabase = { auth: { getSession: () => globalThis.${sessionKey}() } }`,
      }
    }
    return nextLoad(url, context)
  },
})
const { obtenerRecomendaciones } = await import('./recomendaciones.js')
const { ApiError } = await import('../lib/api.js')
hooks.deregister()

const originalFetch = globalThis.fetch
const tokenPrueba = 'credencial-ficticia-solo-test'
const animoId = '12345678-1234-1234-1234-123456789abc'
const emociones = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
const elemento = (tipo = 'movie', cambios = {}) => ({
  tmdbId: 42, titulo: 'Título de prueba', descripcion: 'Sinopsis de prueba',
  poster: 'https://image.tmdb.org/t/p/w500/prueba.jpg', fecha: '2024-05-10',
  calificacion: 8.5, tipo, ...cambios,
})
const cuerpo = (tipo = 'movie', emocion = 'happy', resultados = [elemento(tipo)]) => ({
  emocion, tipo, fuente: 'tmdb', resultados,
})
let llamadas
let sesiones
let respuesta
let httpStatus

beforeEach(() => {
  llamadas = []
  sesiones = 0
  respuesta = cuerpo()
  httpStatus = 200
  globalThis[sessionKey] = async () => {
    sesiones += 1
    return { data: { session: { access_token: tokenPrueba } } }
  }
  globalThis.fetch = async (url, options) => {
    llamadas.push({ url, options })
    return new Response(JSON.stringify(respuesta), { status: httpStatus, headers: { 'Content-Type': 'application/json' } })
  }
})

after(() => {
  globalThis.fetch = originalFetch
  delete globalThis[sessionKey]
})

function verificarError(error, codigo, status) {
  assert.ok(error instanceof ApiError)
  assert.equal(error.codigo, codigo)
  assert.equal(error.status, status)
  assert.ok(!`${error.message} ${error.stack} ${JSON.stringify(error)}`.includes(tokenPrueba))
  return true
}

test('emoción explícita usa solicitarApi real, Gateway, sesión y Bearer sin exponerlo en datos', async () => {
  const resultado = await obtenerRecomendaciones({ emocion: 'happy' })
  assert.equal(sesiones, 1)
  assert.equal(llamadas.length, 1)
  assert.equal(llamadas[0].url, '/api/recomendaciones?emocion=happy&tipo=movie')
  assert.equal(llamadas[0].options.method, 'GET')
  assert.equal(llamadas[0].options.headers.Authorization, `Bearer ${tokenPrueba}`)
  assert.equal(llamadas[0].options.body, undefined)
  assert.ok(!JSON.stringify(resultado).includes(tokenPrueba))
})

test('animoId consulta exclusivamente el registro solicitado y conserva emoción del servidor', async () => {
  respuesta = cuerpo('tv', 'sad')
  const resultado = await obtenerRecomendaciones({ animoId, tipo: 'tv' })
  assert.equal(llamadas[0].url, `/api/recomendaciones?animoId=${animoId}&tipo=tv`)
  assert.equal(resultado.emocion, 'sad')
})

for (const emocion of emociones) {
  test(`acepta emoción ${emocion}`, async () => {
    respuesta = cuerpo('movie', emocion)
    assert.equal((await obtenerRecomendaciones({ emocion })).emocion, emocion)
  })
}

for (const tipo of ['movie', 'tv']) {
  test(`adapta ${tipo} al contrato de tarjeta, cuadrícula, filtro y detalle sin inventar campos`, async () => {
    respuesta = cuerpo(tipo)
    const resultado = await obtenerRecomendaciones({ emocion: 'happy', tipo })
    assert.deepEqual(resultado, {
      emocion: 'happy', tipo, fuente: 'tmdb', resultados: [{
        id: `${tipo}-42`, tmdbId: 42, tipoTmdb: tipo,
        tipo: tipo === 'movie' ? 'Película' : 'Serie', titulo: 'Título de prueba',
        descripcion: 'Sinopsis de prueba', sinopsis: 'Sinopsis de prueba',
        poster: elemento().poster, portada: elemento().poster,
        fecha: '2024-05-10', anio: 2024, generos: [], calificacion: 8.5, esDemostracion: false,
      }],
    })
    const contenido = resultado.resultados[0]
    assert.equal(contenido.generos.join(', '), '')
    assert.equal(contenido.generos.includes('Comedia'), false)
    assert.equal(typeof contenido.id, 'string')
    assert.equal(contenido.sinopsis, respuesta.resultados[0].descripcion)
  })
}

test('identificadores estables distinguen movie y tv con el mismo tmdbId', async () => {
  const primero = await obtenerRecomendaciones({ emocion: 'happy' })
  const segundo = await obtenerRecomendaciones({ emocion: 'happy' })
  respuesta = cuerpo('tv')
  const serie = await obtenerRecomendaciones({ emocion: 'happy', tipo: 'tv' })
  assert.equal(primero.resultados[0].id, segundo.resultados[0].id)
  assert.notEqual(primero.resultados[0].id, serie.resultados[0].id)
})

test('conserva null y no fabrica géneros ni año cuando faltan datos', async () => {
  respuesta = cuerpo('movie', 'happy', [elemento('movie', { poster: null, fecha: null, calificacion: null })])
  const [item] = (await obtenerRecomendaciones({ emocion: 'happy' })).resultados
  assert.equal(item.portada, null)
  assert.equal(item.fecha, null)
  assert.equal(item.anio, null)
  assert.equal(item.calificacion, null)
  assert.deepEqual(item.generos, [])
})

test('respuesta vacía válida se conserva sin datos de respaldo', async () => {
  respuesta = cuerpo('movie', 'happy', [])
  assert.deepEqual((await obtenerRecomendaciones({ emocion: 'happy' })).resultados, [])
})

test('los componentes React existentes renderizan películas y series adaptadas, incluso con campos null', async () => {
  const { transformWithOxc } = await import('vite')
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const modulos = new Map()
  for (const nombre of ['CuadriculaContenido', 'TarjetaContenido', 'DetalleContenido']) {
    const url = new URL(`../pages/Galeria/components/${nombre}.jsx`, import.meta.url)
    const source = await readFile(url, 'utf8')
    const { code } = await transformWithOxc(source, url.pathname, { jsx: { runtime: 'automatic' } })
    modulos.set(url.href, code)
  }
  const jsxHooks = registerHooks({
    load(url, context, nextLoad) {
      if (modulos.has(url)) return { format: 'module', shortCircuit: true, source: modulos.get(url) }
      return nextLoad(url, context)
    },
  })
  try {
    const { default: CuadriculaContenido } = await import('../pages/Galeria/components/CuadriculaContenido.jsx')
    const { default: DetalleContenido } = await import('../pages/Galeria/components/DetalleContenido.jsx')
    for (const tipo of ['movie', 'tv']) {
      respuesta = cuerpo(tipo, 'happy', [elemento(tipo, { poster: null, fecha: null, calificacion: null })])
      const { resultados } = await obtenerRecomendaciones({ emocion: 'happy', tipo })
      const cuadricula = renderToStaticMarkup(createElement(CuadriculaContenido, { contenidos: resultados, onSelect() {} }))
      const detalle = renderToStaticMarkup(createElement(DetalleContenido, { contenido: resultados[0], onClose() {} }))
      assert.ok(cuadricula.includes('Ver detalles de Título de prueba'))
      assert.ok(cuadricula.includes(tipo === 'movie' ? 'Película' : 'Serie'))
      assert.ok(detalle.includes('Sinopsis de prueba'))
      assert.ok(!detalle.includes('Calificación:'))
      assert.ok(!detalle.includes('undefined'))
    }
  } finally {
    jsxHooks.deregister()
  }
})

const invalidos = [
  undefined, null, [], 'happy', {}, { emocion: 'happy', animoId },
  { emocion: '' }, { emocion: 'Happy' }, { emocion: 'unknown' }, { emocion: ['happy'] },
  { emocion: null }, { emocion: 'happy', tipo: '' }, { emocion: 'happy', tipo: 'all' },
  { emocion: 'happy', tipo: 1 }, { emocion: 'happy', tipo: undefined },
  { emocion: 'happy', token: tokenPrueba }, { animoId: '' }, { animoId: 'no-uuid' },
  { animoId: 42 }, { animoId: `${animoId}&emocion=happy` },
]
for (const [indice, parametros] of invalidos.entries()) {
  test(`rechaza parámetros inválidos ${indice + 1} antes de consultar sesión o red`, async () => {
    await assert.rejects(obtenerRecomendaciones(parametros), (error) => verificarError(error, 'parametros-invalidos', 400))
    assert.equal(sesiones, 0)
    assert.equal(llamadas.length, 0)
  })
}

for (const [status, codigo] of [
  [400, 'parametros-invalidos'], [401, 'sesion-expirada'], [404, 'registro-no-encontrado'],
  [502, 'servicio-no-disponible'], [503, 'servicio-no-disponible'],
]) {
  test(`HTTP ${status} mantiene status y código seguros sin divulgar mensajes externos`, async () => {
    httpStatus = status
    respuesta = { error: tokenPrueba }
    await assert.rejects(obtenerRecomendaciones({ animoId }), (error) => verificarError(error, codigo, status))
  })
}

test('sin sesión no hace solicitudes', async () => {
  globalThis[sessionKey] = async () => ({ data: { session: null } })
  await assert.rejects(obtenerRecomendaciones({ emocion: 'happy' }), (error) => verificarError(error, 'sin-sesion', undefined))
  assert.equal(llamadas.length, 0)
})

for (const rechazo of [false, true]) {
  test(`fallo de sesión ${rechazo ? 'rechazado' : 'devuelto'} no expone detalles internos`, async () => {
    globalThis[sessionKey] = async () => {
      if (rechazo) throw new Error(tokenPrueba)
      return { error: new Error(tokenPrueba) }
    }
    await assert.rejects(obtenerRecomendaciones({ emocion: 'happy' }), (error) => verificarError(error, 'sesion-no-disponible', undefined))
    assert.equal(llamadas.length, 0)
  })
}

test('error de red se traduce sin exponer la excepción', async () => {
  globalThis.fetch = async () => { throw new Error(tokenPrueba) }
  await assert.rejects(obtenerRecomendaciones({ emocion: 'happy' }), (error) => verificarError(error, 'sin-conexion', undefined))
})

test('JSON inválido produce un error seguro', async () => {
  globalThis.fetch = async () => new Response(tokenPrueba)
  await assert.rejects(obtenerRecomendaciones({ emocion: 'happy' }), (error) => verificarError(error, 'respuesta-invalida', 200))
})

for (const [nombre, valor] of [
  ['null', null], ['fuente demo', { ...cuerpo(), fuente: 'demo' }],
  ['tipo distinto', cuerpo('tv')], ['emoción distinta', cuerpo('movie', 'sad')],
  ['lista ausente', { ...cuerpo(), resultados: null }],
  ['id inválido', cuerpo('movie', 'happy', [elemento('movie', { tmdbId: 0 })])],
  ['tipo de elemento distinto', cuerpo('movie', 'happy', [elemento('tv')])],
  ['calificación inválida', cuerpo('movie', 'happy', [elemento('movie', { calificacion: 11 })])],
  ['título ausente', cuerpo('movie', 'happy', [elemento('movie', { titulo: '' })])],
  ['poster ausente', cuerpo('movie', 'happy', [elemento('movie', { poster: undefined })])],
  ['duplicados', cuerpo('movie', 'happy', [elemento(), elemento()])],
]) {
  test(`rechaza respuesta incompatible: ${nombre}`, async () => {
    respuesta = valor
    await assert.rejects(obtenerRecomendaciones({ emocion: 'happy' }), (error) => verificarError(error, 'respuesta-invalida', 502))
  })
}
