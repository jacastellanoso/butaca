// Tipos permitidos al explorar o buscar en el catálogo general.
export const TIPOS_CATALOGO = ['all', 'movie', 'tv']
// Tipos permitidos al consultar la ficha detallada de un título específico.
export const TIPOS_DETALLE = ['movie', 'tv']
// Categorías oficiales que presenta la interfaz de la galería principal.
export const CATEGORIAS_GALERIA = [
  'Todos',
  'Acción',
  'Comedia',
  'Drama',
  'Terror',
  'Romance',
  'Ciencia ficción',
  'Animación',
]
// Reglas de paginación y límites de texto para las consultas del catálogo.
export const PAGINACION_CATALOGO = {
  paginaMinima: 1,
  paginaMaxima: 500,
  paginaPorDefecto: 1,
  longitudMaximaBusqueda: 120,
}
// Etiquetas legibles en español para identificar cada tipo de contenido en la interfaz.
export const ETIQUETA_TIPO = {
  movie: 'Película',
  tv: 'Serie',
}
// Traducción de identificadores numéricos de géneros de TMDB (películas y series)
// hacia las categorías unificadas de la galería de Butaca.
export const CATEGORIA_POR_GENERO_TMDB = {
  28: 'Acción',
  12: 'Acción',
  10759: 'Acción',
  35: 'Comedia',
  18: 'Drama',
  80: 'Drama',
  99: 'Drama',
  36: 'Drama',
  10752: 'Drama',
  10768: 'Drama',
  27: 'Terror',
  9648: 'Terror',
  53: 'Terror',
  10749: 'Romance',
  10402: 'Romance',
  878: 'Ciencia ficción',
  14: 'Ciencia ficción',
  10765: 'Ciencia ficción',
  16: 'Animación',
  10751: 'Animación',
  10762: 'Animación',
}
// Diccionario inverso para construir el parámetro with_genres al filtrar por categoría
// en los endpoints discover/movie y discover/tv de TMDB.
export const GENEROS_TMDB_POR_CATEGORIA = {
  Acción: [28, 12, 10759],
  Comedia: [35],
  Drama: [18, 80, 99, 36, 10752, 10768],
  Terror: [27, 9648, 53],
  Romance: [10749, 10402],
  'Ciencia ficción': [878, 14, 10765],
  Animación: [16, 10751, 10762],
}