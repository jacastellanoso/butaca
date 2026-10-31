import { EMOCIONES, ORIGENES, PAGINACION } from '../constants/emociones.js'

// Validación con if, como el resto del proyecto (Zod se incorpora en otra rama).
// Cada función devuelve { status, error } si falla o { datos } si es válida.
// Solo se copian los campos conocidos: usuarioId, imágenes u otros campos
// enviados por el cliente nunca llegan a la base.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ENTERO = /^\d+$/

const fallo = (error, status = 400) => ({ status, error })

const esObjetoPlano = (valor) =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const esConfianzaValida = (valor) =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1

export function validarNuevoAnimo(body) {
  if (!esObjetoPlano(body)) {
    return fallo('El cuerpo debe ser un objeto JSON.')
  }

  // El permiso de cámara no autoriza a conservar el historial: se exige
  // el booleano true explícito de este campo, sin aceptar equivalentes.
  if (body.consentimientoHistorial !== true) {
    return fallo(
      'No se guarda el resultado sin autorización explícita para conservar el historial emocional.',
      403,
    )
  }

  const { emocion, confianza, origen = 'deteccion' } = body

  if (!EMOCIONES.includes(emocion)) {
    return fallo('La emoción no es válida.')
  }
  if (!ORIGENES.includes(origen)) {
    return fallo('El origen debe ser "deteccion" o "confirmada".')
  }

  if (origen === 'deteccion' && !esConfianzaValida(confianza)) {
    return fallo('La confianza debe ser un número entre 0 y 1.')
  }
  if (origen === 'confirmada' && confianza != null && !esConfianzaValida(confianza)) {
    return fallo('La confianza debe ser un número entre 0 y 1.')
  }

  return { datos: { emocion, origen, confianza: confianza ?? null } }
}

function leerTexto(query, nombre) {
  const valor = query[nombre]
  if (valor === undefined) return { valor: undefined }
  // ?pagina=1&pagina=2 llega como arreglo: se rechaza en lugar de elegir uno.
  if (typeof valor !== 'string') return { error: `El parámetro ${nombre} no es válido.` }
  return { valor }
}

function leerEntero(query, nombre, { min, max, porDefecto }) {
  const { valor, error } = leerTexto(query, nombre)
  if (error) return { error }
  if (valor === undefined) return { valor: porDefecto }

  const numero = Number(valor)
  if (!ENTERO.test(valor) || numero < min || numero > max) {
    return { error: `El parámetro ${nombre} debe ser un entero entre ${min} y ${max}.` }
  }
  return { valor: numero }
}

function leerFecha(query, nombre) {
  const { valor, error } = leerTexto(query, nombre)
  if (error || valor === undefined) return { error, valor }

  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) {
    return { error: `El parámetro ${nombre} debe ser una fecha ISO 8601.` }
  }
  return { valor: fecha }
}

function leerOpcion(query, nombre, opciones) {
  const { valor, error } = leerTexto(query, nombre)
  if (error || valor === undefined) return { error, valor }
  if (!opciones.includes(valor)) return { error: `El parámetro ${nombre} no es válido.` }
  return { valor }
}

// GET /api/animos?pagina&limite&emocion&origen&desde&hasta&orden
export function validarConsultaHistorial(query) {
  const campos = {
    pagina: leerEntero(query, 'pagina', { min: 1, max: 10_000, porDefecto: 1 }),
    limite: leerEntero(query, 'limite', {
      min: 1,
      max: PAGINACION.limiteMaximo,
      porDefecto: PAGINACION.limitePorDefecto,
    }),
    emocion: leerOpcion(query, 'emocion', EMOCIONES),
    origen: leerOpcion(query, 'origen', ORIGENES),
    desde: leerFecha(query, 'desde'),
    hasta: leerFecha(query, 'hasta'),
    orden: leerOpcion(query, 'orden', ['desc', 'asc']),
  }

  const datos = {}
  for (const [nombre, { valor, error }] of Object.entries(campos)) {
    if (error) return fallo(error)
    datos[nombre] = valor
  }

  if (datos.desde && datos.hasta && datos.desde > datos.hasta) {
    return fallo('El parámetro desde no puede ser posterior a hasta.')
  }

  datos.orden ??= 'desc'
  return { datos }
}

export const esIdValido = (id) => UUID.test(id)
