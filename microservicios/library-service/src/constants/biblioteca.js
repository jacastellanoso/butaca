// Las siete expresiones emocionales reconocidas en la plataforma.
export const EMOCIONES = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
]

// Tipos de obras audiovisuales compatibles con el catálogo de TMDB.
export const TIPOS_CONTENIDO = ['movie', 'tv']

// Reglas por defecto y topes para las consultas paginadas.
export const PAGINACION = {
  limitePorDefecto: 20,
  limiteMaximo: 100,
  paginaMaxima: 10_000,
}

// Topes para textos y códigos numéricos de contenido.
export const LIMITES_TEXTO = {
  tituloMaximo: 250,
  posterMaximo: 500,
  tmdbIdMaximo: 999_999_999,
}