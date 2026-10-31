import {
  CATEGORIAS_GALERIA,
  PAGINACION_CATALOGO,
  TIPOS_CATALOGO,
  TIPOS_DETALLE,
} from '../constants/catalogo.js'

// Validación defensiva con condicionales (el esquema con Zod se integra en su rama dedicada).
// Cada función devuelve { status: 400, error } cuando falla o { datos } cuando la entrada es válida.

const ENTERO_POSITIVO = /^\d+$/
const TMDB_ID_MAXIMO = 999_999_999

const fallo = (error, status = 400) => ({ status, error })

function leerTexto(objeto, nombre) {
  const valor = objeto?.[nombre]
  if (valor === undefined) return { valor: undefined }
  // Si el parámetro se repite en la URL (?tipo=movie&tipo=tv), llega como arreglo y se rechaza.
  if (typeof valor !== 'string') {
    return { error: `El parámetro ${nombre} no es válido.` }
  }
  return { valor }
}

function leerOpcion(objeto, nombre, opciones, porDefecto) {
  const { valor, error } = leerTexto(objeto, nombre)
  if (error) return { error }
  if (valor === undefined) return { valor: porDefecto }
  if (!opciones.includes(valor)) {
    return { error: `El parámetro ${nombre} no es válido.` }
  }
  return { valor }
}

function leerEntero(objeto, nombre, { min, max, porDefecto }) {
  const { valor, error } = leerTexto(objeto, nombre)
  if (error) return { error }
  if (valor === undefined) return { valor: porDefecto }

  const textoLimpio = valor.trim()
  const numero = Number(textoLimpio)
  if (!ENTERO_POSITIVO.test(textoLimpio) || !Number.isSafeInteger(numero) || numero < min || numero > max) {
    return { error: `El parámetro ${nombre} debe ser un entero entre ${min} y ${max}.` }
  }
  return { valor: numero }
}

function leerBusqueda(query) {
  const { valor, error } = leerTexto(query, 'busqueda')
  if (error) return { error }
  if (valor === undefined) return { valor: null }

  const textoRecortado = valor.trim()
  if (textoRecortado.length === 0) {
    return { valor: null }
  }
  if (textoRecortado.length > PAGINACION_CATALOGO.longitudMaximaBusqueda) {
    return {
      error: `El parámetro busqueda no puede superar ${PAGINACION_CATALOGO.longitudMaximaBusqueda} caracteres.`,
    }
  }
  return { valor: textoRecortado }
}

// GET /api/catalogo?tipo&categoria&pagina&busqueda
export function validarConsultaCatalogo(query = {}) {
  const campos = {
    tipo: leerOpcion(query, 'tipo', TIPOS_CATALOGO, 'all'),
    categoria: leerOpcion(query, 'categoria', CATEGORIAS_GALERIA, 'Todos'),
    pagina: leerEntero(query, 'pagina', {
      min: PAGINACION_CATALOGO.paginaMinima,
      max: PAGINACION_CATALOGO.paginaMaxima,
      porDefecto: PAGINACION_CATALOGO.paginaPorDefecto,
    }),
    busqueda: leerBusqueda(query),
  }

  const datos = {}
  for (const [nombre, resultado] of Object.entries(campos)) {
    if (resultado.error) return fallo(resultado.error)
    datos[nombre] = resultado.valor
  }

  return { datos }
}

// GET /api/catalogo/:tipo/:tmdbId
export function validarParametrosDetalle(params = {}) {
  const tipoResultado = leerOpcion(params, 'tipo', TIPOS_DETALLE, undefined)
  if (tipoResultado.error || tipoResultado.valor === undefined) {
    return fallo('El parámetro tipo debe ser "movie" o "tv".')
  }

  const idResultado = leerEntero(params, 'tmdbId', {
    min: 1,
    max: TMDB_ID_MAXIMO,
    porDefecto: undefined,
  })
  if (idResultado.error || idResultado.valor === undefined) {
    return fallo(`El parámetro tmdbId debe ser un entero positivo entre 1 y ${TMDB_ID_MAXIMO}.`)
  }

  return {
    datos: {
      tipo: tipoResultado.valor,
      tmdbId: idResultado.valor,
    },
  }
}