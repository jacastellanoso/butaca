import {
  EMOCIONES,
  LIMITES_TEXTO,
  PAGINACION,
  TIPOS_CONTENIDO,
} from '../constants/biblioteca.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ENTERO = /^\d+$/

const fallo = (error, status = 400) => ({ status, error })

const esObjetoPlano = (valor) =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

export const esIdValido = (id) => typeof id === 'string' && UUID.test(id)

function validarTmdbId(tmdbId) {
  if (
    !Number.isInteger(tmdbId) ||
    tmdbId < 1 ||
    tmdbId > LIMITES_TEXTO.tmdbIdMaximo
  ) {
    return `tmdbId debe ser un entero entre 1 y ${LIMITES_TEXTO.tmdbIdMaximo}.`
  }
  return null
}

function validarTitulo(titulo) {
  if (typeof titulo !== 'string') {
    return { error: 'El título es obligatorio.' }
  }
  const limpio = titulo.trim()
  if (limpio.length === 0) {
    return { error: 'El título es obligatorio.' }
  }
  if (limpio.length > LIMITES_TEXTO.tituloMaximo) {
    return {
      error: `El título no puede superar los ${LIMITES_TEXTO.tituloMaximo} caracteres.`,
    }
  }
  return { valor: limpio }
}

function validarPoster(poster) {
  if (poster === undefined || poster === null) {
    return { valor: null }
  }
  if (typeof poster !== 'string') {
    return { error: 'El póster debe ser una cadena de texto o nulo.' }
  }
  const limpio = poster.trim()
  if (limpio.length === 0) {
    return { error: 'El póster no puede ser una cadena vacía.' }
  }
  if (limpio.length > LIMITES_TEXTO.posterMaximo) {
    return {
      error: `El póster no puede superar los ${LIMITES_TEXTO.posterMaximo} caracteres.`,
    }
  }
  return { valor: limpio }
}

function validarCalificacion(calificacion) {
  if (calificacion === undefined || calificacion === null) {
    return { valor: null }
  }
  if (
    typeof calificacion !== 'number' ||
    !Number.isFinite(calificacion) ||
    calificacion < 0 ||
    calificacion > 10
  ) {
    return { error: 'La calificación debe ser un número entre 0 y 10.' }
  }
  return { valor: Math.round(calificacion * 10) / 10 }
}

// POST /api/favoritos
export function validarNuevoFavorito(body) {
  if (!esObjetoPlano(body)) {
    return fallo('El cuerpo debe ser un objeto JSON.')
  }

  const { tmdbId, tipo, titulo, poster } = body

  const errorTmdb = validarTmdbId(tmdbId)
  if (errorTmdb) return fallo(errorTmdb)

  if (!TIPOS_CONTENIDO.includes(tipo)) {
    return fallo('El tipo debe ser "movie" o "tv".')
  }

  const tituloValidado = validarTitulo(titulo)
  if (tituloValidado.error) return fallo(tituloValidado.error)

  const posterValidado = validarPoster(poster)
  if (posterValidado.error) return fallo(posterValidado.error)

  return {
    datos: {
      tmdbId,
      tipo,
      titulo: tituloValidado.valor,
      poster: posterValidado.valor,
    },
  }
}

// POST /api/historial
export function validarNuevoHistorial(body) {
  if (!esObjetoPlano(body)) {
    return fallo('El cuerpo debe ser un objeto JSON.')
  }

  const { emocion, tmdbId, tipo, titulo, poster, calificacion } = body

  if (!EMOCIONES.includes(emocion)) {
    return fallo('La emoción no es válida.')
  }

  const errorTmdb = validarTmdbId(tmdbId)
  if (errorTmdb) return fallo(errorTmdb)

  if (!TIPOS_CONTENIDO.includes(tipo)) {
    return fallo('El tipo debe ser "movie" o "tv".')
  }

  const tituloValidado = validarTitulo(titulo)
  if (tituloValidado.error) return fallo(tituloValidado.error)

  const posterValidado = validarPoster(poster)
  if (posterValidado.error) return fallo(posterValidado.error)

  const calificacionValidada = validarCalificacion(calificacion)
  if (calificacionValidada.error) return fallo(calificacionValidada.error)

  return {
    datos: {
      emocion,
      tmdbId,
      tipo,
      titulo: tituloValidado.valor,
      poster: posterValidado.valor,
      calificacion: calificacionValidada.valor,
    },
  }
}

function leerTexto(query, nombre) {
  const valor = query?.[nombre]
  if (valor === undefined) return { valor: undefined }
  if (typeof valor !== 'string') {
    return { error: `El parámetro ${nombre} no es válido.` }
  }
  return { valor }
}

function leerEntero(query, nombre, { min, max, porDefecto }) {
  const { valor, error } = leerTexto(query, nombre)
  if (error) return { error }
  if (valor === undefined) return { valor: porDefecto }

  const numero = Number(valor)
  if (!ENTERO.test(valor) || numero < min || numero > max) {
    return {
      error: `El parámetro ${nombre} debe ser un entero entre ${min} y ${max}.`,
    }
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
  if (!opciones.includes(valor)) {
    return { error: `El parámetro ${nombre} no es válido.` }
  }
  return { valor }
}

// GET /api/favoritos?pagina&limite&tipo&orden
export function validarConsultaFavoritos(query = {}) {
  const campos = {
    pagina: leerEntero(query, 'pagina', {
      min: 1,
      max: PAGINACION.paginaMaxima,
      porDefecto: 1,
    }),
    limite: leerEntero(query, 'limite', {
      min: 1,
      max: PAGINACION.limiteMaximo,
      porDefecto: PAGINACION.limitePorDefecto,
    }),
    tipo: leerOpcion(query, 'tipo', TIPOS_CONTENIDO),
    orden: leerOpcion(query, 'orden', ['desc', 'asc']),
  }

  const datos = {}
  for (const [nombre, { valor, error }] of Object.entries(campos)) {
    if (error) return fallo(error)
    datos[nombre] = valor
  }

  datos.orden ??= 'desc'
  return { datos }
}

// GET /api/historial?pagina&limite&emocion&tipo&desde&hasta&orden
export function validarConsultaHistorial(query = {}) {
  const campos = {
    pagina: leerEntero(query, 'pagina', {
      min: 1,
      max: PAGINACION.paginaMaxima,
      porDefecto: 1,
    }),
    limite: leerEntero(query, 'limite', {
      min: 1,
      max: PAGINACION.limiteMaximo,
      porDefecto: PAGINACION.limitePorDefecto,
    }),
    emocion: leerOpcion(query, 'emocion', EMOCIONES),
    tipo: leerOpcion(query, 'tipo', TIPOS_CONTENIDO),
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