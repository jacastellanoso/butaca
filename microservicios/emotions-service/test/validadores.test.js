import assert from 'node:assert/strict'
import { test } from 'node:test'
import { esIdValido, validarConsultaHistorial, validarNuevoAnimo } from '../src/validators/animos.validator.js'

const animo = { emocion: 'happy', confianza: 0.5, consentimientoHistorial: true }
const consentimiento = 'No se guarda el resultado sin autorización explícita para conservar el historial emocional.'
const fallo = (error, status = 400) => ({ status, error })

for (const confianza of [0, 1, 0.5]) {
  test(`detección acepta confianza ${confianza} y elimina campos ajenos`, () => {
    assert.deepEqual(validarNuevoAnimo({ ...animo, confianza, usuarioId: 'ajeno', imagen: 'no guardar' }),
      { datos: { emocion: 'happy', origen: 'deteccion', confianza } })
  })
}
for (const confianza of [undefined, null]) {
  test(`confirmada normaliza confianza ${confianza} a null`, () => {
    assert.deepEqual(validarNuevoAnimo({ ...animo, origen: 'confirmada', confianza }),
      { datos: { emocion: 'happy', origen: 'confirmada', confianza: null } })
  })
}
for (const confianza of ['0.5', -0.01, 1.01, NaN, Infinity, null, undefined]) {
  test(`detección rechaza confianza ${confianza}`, () => {
    assert.deepEqual(validarNuevoAnimo({ ...animo, confianza }), fallo('La confianza debe ser un número entre 0 y 1.'))
  })
}
test('consentimiento exige true y precede a errores de emoción y confianza', () => {
  for (const valor of [undefined, null, false, 'true', 1]) {
    assert.deepEqual(validarNuevoAnimo({ consentimientoHistorial: valor }), fallo(consentimiento, 403))
  }
  for (const body of [undefined, null, [], 'texto', 1]) {
    assert.deepEqual(validarNuevoAnimo(body), fallo('El cuerpo debe ser un objeto JSON.'))
  }
})
test('prioridad de emoción y origen conserva los mensajes', () => {
  assert.deepEqual(validarNuevoAnimo({ ...animo, emocion: 'otra', origen: 'otro' }), fallo('La emoción no es válida.'))
  assert.deepEqual(validarNuevoAnimo({ ...animo, origen: null }), fallo('El origen debe ser "deteccion" o "confirmada".'))
  assert.deepEqual(validarNuevoAnimo({ ...animo, origen: 'confirmada', confianza: '1' }), fallo('La confianza debe ser un número entre 0 y 1.'))
})
test('confirmada acepta la clave confianza ausente en JSON', () => {
  assert.deepEqual(validarNuevoAnimo({ emocion: 'sad', origen: 'confirmada', consentimientoHistorial: true }),
    { datos: { emocion: 'sad', origen: 'confirmada', confianza: null } })
})
test('consulta conserva defaults, claves undefined y omite desconocidos', () => {
  assert.deepEqual(validarConsultaHistorial({ desconocido: 'ignorado' }), { datos: {
    pagina: 1, limite: 20, emocion: undefined, origen: undefined, desde: undefined, hasta: undefined, orden: 'desc',
  } })
})
test('consulta acepta límites, ceros iniciales y fechas históricamente válidas', () => {
  const resultado = validarConsultaHistorial({ pagina: '10000', limite: '100', desde: '2026-01-01', hasta: '2026-01-01', orden: 'asc' })
  assert.equal(resultado.datos.pagina, 10000)
  assert.equal(resultado.datos.limite, 100)
  assert.deepEqual(resultado.datos.desde, new Date('2026-01-01'))
  assert.equal(validarConsultaHistorial({ pagina: '0001', desde: 'January 1, 2026' }).datos.pagina, 1)
})
test('consulta rechaza repetidos, espacios y valores fuera del rango sin coerción', () => {
  for (const pagina of ['0', '10001', ' 1 ', '1.0', '1e2', '']) {
    assert.deepEqual(validarConsultaHistorial({ pagina }), fallo('El parámetro pagina debe ser un entero entre 1 y 10000.'))
  }
  for (const pagina of [['1', '2'], 1, null]) {
    assert.deepEqual(validarConsultaHistorial({ pagina }), fallo('El parámetro pagina no es válido.'))
  }
  assert.deepEqual(validarConsultaHistorial({ limite: '101' }), fallo('El parámetro limite debe ser un entero entre 1 y 100.'))
})
test('fechas inválidas y rangos invertidos conservan mensajes y prioridad', () => {
  assert.deepEqual(validarConsultaHistorial({ desde: 'inválida' }), fallo('El parámetro desde debe ser una fecha ISO 8601.'))
  assert.deepEqual(validarConsultaHistorial({ desde: '2026-02-01', hasta: '2026-01-01' }), fallo('El parámetro desde no puede ser posterior a hasta.'))
  assert.deepEqual(validarConsultaHistorial({ pagina: '0', desde: 'inválida' }), fallo('El parámetro pagina debe ser un entero entre 1 y 10000.'))
})
test('UUID conserva formato, mayúsculas y versiones previas', () => {
  assert.equal(esIdValido('ABCDEF01-0000-0000-0000-000000000000'), true)
  for (const id of ['', '550', null, undefined]) assert.equal(esIdValido(id), false)
})
