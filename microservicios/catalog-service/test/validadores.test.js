import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validarConsultaCatalogo, validarParametrosDetalle } from '../src/validators/catalogo.validator.js'

const fallo = (error) => ({ status: 400, error })
test('consulta mantiene defaults, búsqueda nula y claves desconocidas ignoradas', () => {
  assert.deepEqual(validarConsultaCatalogo({ extra: ['a', 'b'] }),
    { datos: { tipo: 'all', categoria: 'Todos', pagina: 1, busqueda: null } })
  assert.deepEqual(validarConsultaCatalogo(), validarConsultaCatalogo(null))
})
for (const pagina of ['1', '500', ' 001 ']) {
  test(`página válida ${pagina} se recorta y convierte`, () => {
    assert.equal(validarConsultaCatalogo({ pagina }).datos.pagina, Number(pagina))
  })
}
for (const pagina of ['', '0', '501', '1.0', '1e2', '9007199254740992']) {
  test(`página inválida ${pagina} conserva error`, () => {
    assert.deepEqual(validarConsultaCatalogo({ pagina }), fallo('El parámetro pagina debe ser un entero entre 1 y 500.'))
  })
}
test('consulta rechaza parámetros repetidos y tipos no textuales', () => {
  for (const nombre of ['tipo', 'categoria', 'pagina', 'busqueda']) {
    for (const valor of [['movie', 'tv'], null, 1, {}]) {
      assert.deepEqual(validarConsultaCatalogo({ [nombre]: valor }), fallo(`El parámetro ${nombre} no es válido.`))
    }
  }
})
test('tipo y categoría respetan valores y prioridad', () => {
  assert.equal(validarConsultaCatalogo({ tipo: 'tv', categoria: 'Acción' }).datos.categoria, 'Acción')
  assert.deepEqual(validarConsultaCatalogo({ tipo: 'otro', categoria: 'otra', pagina: '0' }), fallo('El parámetro tipo no es válido.'))
  assert.deepEqual(validarConsultaCatalogo({ categoria: 'otra' }), fallo('El parámetro categoria no es válido.'))
})
test('búsqueda conserva recorte, vacío y límite de 120', () => {
  assert.equal(validarConsultaCatalogo({ busqueda: '   ' }).datos.busqueda, null)
  assert.equal(validarConsultaCatalogo({ busqueda: ' Matrix ' }).datos.busqueda, 'Matrix')
  assert.equal(validarConsultaCatalogo({ busqueda: ` ${'a'.repeat(120)} ` }).datos.busqueda.length, 120)
  assert.deepEqual(validarConsultaCatalogo({ busqueda: 'a'.repeat(121) }), fallo('El parámetro busqueda no puede superar 120 caracteres.'))
})
test('detalle acepta ambos tipos y límites de TMDB con espacios', () => {
  for (const tipo of ['movie', 'tv']) {
    for (const tmdbId of ['1', '999999999', ' 00550 ']) {
      assert.deepEqual(validarParametrosDetalle({ tipo, tmdbId }), { datos: { tipo, tmdbId: Number(tmdbId) } })
    }
  }
})
test('detalle preserva mensajes específicos y prioridad del tipo', () => {
  for (const tipo of [undefined, null, 'all', ['movie']]) {
    assert.deepEqual(validarParametrosDetalle({ tipo, tmdbId: '0' }), fallo('El parámetro tipo debe ser "movie" o "tv".'))
  }
  for (const tmdbId of [undefined, null, 550, ['550'], '0', '1000000000', '1e2', '1.5']) {
    assert.deepEqual(validarParametrosDetalle({ tipo: 'movie', tmdbId }), fallo('El parámetro tmdbId debe ser un entero positivo entre 1 y 999999999.'))
  }
})
