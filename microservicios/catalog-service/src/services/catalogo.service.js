import { env } from '../config/env.js'
import {
  CATEGORIA_POR_GENERO_TMDB,
  ETIQUETA_TIPO,
  GENEROS_TMDB_POR_CATEGORIA,
  PAGINACION_CATALOGO,
} from '../constants/catalogo.js'

const SINOPSIS_POR_DEFECTO = 'Sin sinopsis disponible en español.'

function crearErrorCatalogo(mensaje, codigo, status = 502) {
  const error = new Error(mensaje)
  error.code = codigo
  error.status = status
  return error
}

export function construirUrlImagen(rutaImagen) {
  if (typeof rutaImagen !== 'string' || !rutaImagen.trim()) {
    return null
  }
  const base = (env.tmdbImageBaseUrl || 'https://image.tmdb.org/t/p/w500').replace(/\/+$/, '')
  const rutaNormalizada = rutaImagen.trim().startsWith('/')
    ? rutaImagen.trim()
    : `/${rutaImagen.trim()}`
  return `${base}${rutaNormalizada}`
}

export function extraerAnio(fechaTexto) {
  if (typeof fechaTexto !== 'string' || fechaTexto.trim().length < 4) {
    return null
  }
  const anio = Number.parseInt(fechaTexto.trim().slice(0, 4), 10)
  return Number.isInteger(anio) && anio > 1800 && anio < 3000 ? anio : null
}

export function mapearGenerosACategorias(registroTmdb) {
  const ids = []

  if (Array.isArray(registroTmdb?.genre_ids)) {
    for (const id of registroTmdb.genre_ids) {
      ids.push(Number(id))
    }
  }

  if (Array.isArray(registroTmdb?.genres)) {
    for (const genero of registroTmdb.genres) {
      const id = typeof genero === 'object' && genero !== null ? Number(genero.id) : Number(genero)
      ids.push(id)
    }
  }

  const categoriasUnicas = new Set()
  for (const id of ids) {
    const categoria = CATEGORIA_POR_GENERO_TMDB[id]
    if (categoria) {
      categoriasUnicas.add(categoria)
    }
  }

  return Array.from(categoriasUnicas)
}

function resolverTipoTmdb(registroTmdb, tipoSolicitado = 'movie') {
  if (registroTmdb?.media_type === 'movie' || registroTmdb?.media_type === 'tv') {
    return registroTmdb.media_type
  }
  if (tipoSolicitado === 'movie' || tipoSolicitado === 'tv') {
    return tipoSolicitado
  }
  if (typeof registroTmdb?.first_air_date === 'string' || typeof registroTmdb?.name === 'string') {
    return 'tv'
  }
  return 'movie'
}

export function normalizarElementoCatalogo(registroTmdb, tipoPorDefecto = 'movie') {
  const tipoTmdb = resolverTipoTmdb(registroTmdb, tipoPorDefecto)
  const tmdbId = Number(registroTmdb?.id)
  const tituloCrudo =
    registroTmdb?.title ??
    registroTmdb?.name ??
    registroTmdb?.original_title ??
    registroTmdb?.original_name ??
    ''
  const titulo = typeof tituloCrudo === 'string' && tituloCrudo.trim() ? tituloCrudo.trim() : 'Sin título'

  const fechaCruda = registroTmdb?.release_date ?? registroTmdb?.first_air_date ?? null
  const fecha = typeof fechaCruda === 'string' && fechaCruda.trim() ? fechaCruda.trim() : null
  const anio = extraerAnio(fecha)

  const sinopsisCruda = typeof registroTmdb?.overview === 'string' ? registroTmdb.overview.trim() : ''
  const sinopsis = sinopsisCruda || SINOPSIS_POR_DEFECTO

  const calificacion =
    typeof registroTmdb?.vote_average === 'number' &&
    Number.isFinite(registroTmdb.vote_average) &&
    registroTmdb.vote_average > 0
      ? Number(registroTmdb.vote_average.toFixed(1))
      : null

  const portada = construirUrlImagen(registroTmdb?.poster_path)

  return {
    id: `${tipoTmdb}-${tmdbId}`,
    tmdbId,
    titulo,
    tipo: ETIQUETA_TIPO[tipoTmdb] ?? 'Película',
    tipoTmdb,
    anio,
    fecha,
    generos: mapearGenerosACategorias(registroTmdb),
    calificacion,
    sinopsis,
    descripcion: sinopsis,
    portada,
    poster: portada,
    esDemostracion: false,
  }
}

export function normalizarDetalleCatalogo(registroTmdb, tipoTmdb = 'movie') {
  const base = normalizarElementoCatalogo(registroTmdb, tipoTmdb)
  const esSerie = base.tipoTmdb === 'tv'

  const duracionPelicula =
    typeof registroTmdb?.runtime === 'number' && registroTmdb.runtime > 0
      ? registroTmdb.runtime
      : null
  const duracionSerie =
    Array.isArray(registroTmdb?.episode_run_time) &&
    typeof registroTmdb.episode_run_time[0] === 'number' &&
    registroTmdb.episode_run_time[0] > 0
      ? registroTmdb.episode_run_time[0]
      : null

  return {
    ...base,
    backdrop: construirUrlImagen(registroTmdb?.backdrop_path),
    duracionMinutos: esSerie ? duracionSerie : duracionPelicula,
    numeroTemporadas:
      esSerie && typeof registroTmdb?.number_of_seasons === 'number'
        ? registroTmdb.number_of_seasons
        : null,
    numeroEpisodios:
      esSerie && typeof registroTmdb?.number_of_episodes === 'number'
        ? registroTmdb.number_of_episodes
        : null,
    estadoPublicacion:
      typeof registroTmdb?.status === 'string' && registroTmdb.status.trim()
        ? registroTmdb.status.trim()
        : null,
    idiomaOriginal:
      typeof registroTmdb?.original_language === 'string' && registroTmdb.original_language.trim()
        ? registroTmdb.original_language.trim()
        : null,
  }
}

async function consultarTmdb(ruta, parametros = {}, { permitirNoEncontrado = false } = {}) {
  const claveTmdb = (env.tmdbApiKey ?? '').trim()
  if (!claveTmdb) {
    throw crearErrorCatalogo(
      'La credencial TMDB_API_KEY no está configurada en el servicio de catálogo.',
      'TMDB_CONFIG_MISSING',
      500,
    )
  }

  const baseUrl = (env.tmdbBaseUrl || 'https://api.themoviedb.org/3').replace(/\/+$/, '')
  const rutaNormalizada = ruta.startsWith('/') ? ruta : `/${ruta}`
  const url = new URL(`${baseUrl}${rutaNormalizada}`)

  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(clave, String(valor))
    }
  }

  const encabezados = {
    Accept: 'application/json',
  }

  // Soporta tanto Token de lectura v4 (JWT que inicia con eyJ) como API Key v3 en query.
  if (claveTmdb.startsWith('eyJ')) {
    encabezados.Authorization = `Bearer ${claveTmdb}`
  } else {
    url.searchParams.set('api_key', claveTmdb)
  }

  const tiempoLimite = Number(env.tmdbTimeoutMs) || 5000

  let respuesta
  try {
    respuesta = await fetch(url, {
      method: 'GET',
      headers: encabezados,
      signal: AbortSignal.timeout(tiempoLimite),
    })
  } catch (error) {
    if (
      error?.name === 'TimeoutError' ||
      error?.name === 'AbortError' ||
      error?.code === 'ABORT_ERR'
    ) {
      throw crearErrorCatalogo(
        'La solicitud hacia TMDB superó el tiempo máximo de espera.',
        'TMDB_TIMEOUT',
        503,
      )
    }
    throw crearErrorCatalogo(
      'No fue posible establecer conexión con el proveedor de catálogo TMDB.',
      'TMDB_UPSTREAM_ERROR',
      502,
    )
  }

  if (permitirNoEncontrado && respuesta.status === 404) {
    return null
  }

  if (!respuesta.ok) {
    const errorUpstream = crearErrorCatalogo(
      `El proveedor TMDB respondió con un estado HTTP inesperado (${respuesta.status}).`,
      'TMDB_UPSTREAM_ERROR',
      502,
    )
    errorUpstream.upstreamStatus = respuesta.status
    throw errorUpstream
  }

  try {
    return await respuesta.json()
  } catch {
    throw crearErrorCatalogo(
      'El proveedor TMDB devolvió una respuesta con formato inválido.',
      'TMDB_UPSTREAM_ERROR',
      502,
    )
  }
}

function resolverConsultaListado({ tipo, categoria, busqueda, pagina }) {
  const parametros = {
    language: 'es-ES',
    include_adult: 'false',
    page: pagina,
  }

  if (busqueda) {
    parametros.query = busqueda
    if (tipo === 'movie') return { ruta: '/search/movie', tipoPorDefecto: 'movie', parametros }
    if (tipo === 'tv') return { ruta: '/search/tv', tipoPorDefecto: 'tv', parametros }
    return { ruta: '/search/multi', tipoPorDefecto: 'movie', parametros }
  }

  const generosCategoria =
    categoria && categoria !== 'Todos' ? GENEROS_TMDB_POR_CATEGORIA[categoria] : null

  if (generosCategoria?.length) {
    parametros.with_genres = generosCategoria.join('|')
    parametros.sort_by = 'popularity.desc'
    if (tipo === 'tv') {
      return { ruta: '/discover/tv', tipoPorDefecto: 'tv', parametros }
    }
    return { ruta: '/discover/movie', tipoPorDefecto: 'movie', parametros }
  }

  if (tipo === 'movie') {
    parametros.sort_by = 'popularity.desc'
    return { ruta: '/discover/movie', tipoPorDefecto: 'movie', parametros }
  }

  if (tipo === 'tv') {
    parametros.sort_by = 'popularity.desc'
    return { ruta: '/discover/tv', tipoPorDefecto: 'tv', parametros }
  }

  return {
    ruta: '/trending/all/week',
    tipoPorDefecto: 'movie',
    parametros: { language: 'es-ES', page: pagina },
  }
}

export const catalogoService = {
  async listar({
    tipo = 'all',
    categoria = 'Todos',
    busqueda = null,
    pagina = PAGINACION_CATALOGO.paginaPorDefecto,
  } = {}) {
    const tipoNormalizado = tipo || 'all'
    const categoriaNormalizada = categoria || 'Todos'
    const busquedaLimpia =
      typeof busqueda === 'string' && busqueda.trim() ? busqueda.trim() : null
    const paginaSolicitada = Number(pagina) || PAGINACION_CATALOGO.paginaPorDefecto

    const { ruta, tipoPorDefecto, parametros } = resolverConsultaListado({
      tipo: tipoNormalizado,
      categoria: categoriaNormalizada,
      busqueda: busquedaLimpia,
      pagina: paginaSolicitada,
    })

    const datosTmdb = await consultarTmdb(ruta, parametros)
    const listaCruda = Array.isArray(datosTmdb?.results) ? datosTmdb.results : []

    // En /search/multi o /trending/all/week pueden aparecer registros de tipo 'person'; se descartan.
    const registrosAudiovisuales = listaCruda.filter((item) => {
      if (!item || typeof item !== 'object' || !item.id) return false
      if (item.media_type && item.media_type !== 'movie' && item.media_type !== 'tv') {
        return false
      }
      return true
    })

    let resultados = registrosAudiovisuales.map((item) =>
      normalizarElementoCatalogo(item, tipoPorDefecto),
    )

    // Si hay búsqueda por texto combinada con una categoría específica, se filtra sobre los resultados normalizados.
    if (busquedaLimpia && categoriaNormalizada !== 'Todos') {
      resultados = resultados.filter((elemento) =>
        elemento.generos.includes(categoriaNormalizada),
      )
    }

    const totalResultados = Number(datosTmdb?.total_results) || resultados.length
    const totalPaginasRaw = Number(datosTmdb?.total_pages) || (resultados.length > 0 ? 1 : 0)
    const totalPaginas = Math.min(totalPaginasRaw, PAGINACION_CATALOGO.paginaMaxima)
    const paginaActual = Number(datosTmdb?.page) || paginaSolicitada

    return {
      fuente: 'tmdb',
      filtros: {
        tipo: tipoNormalizado,
        categoria: categoriaNormalizada,
        busqueda: busquedaLimpia,
        pagina: paginaSolicitada,
      },
      resultados,
      paginacion: {
        pagina: paginaActual,
        totalPaginas,
        totalResultados,
        total: totalResultados,
      },
    }
  },

  async obtenerDetalle({ tipo, tmdbId }) {
    const ruta = `/${tipo}/${tmdbId}`
    const datosTmdb = await consultarTmdb(
      ruta,
      { language: 'es-ES' },
      { permitirNoEncontrado: true },
    )

    if (!datosTmdb) {
      return null
    }

    return normalizarDetalleCatalogo(datosTmdb, tipo)
  },
}