// Datos de EJEMPLO con la forma que tendrá la respuesta real.
// pf11_TMDB reemplaza esta función por la llamada a TMDB (con la API key
// en el .env del backend) y la lógica que traduce emoción → géneros.
const EJEMPLOS = [
  { tmdbId: 1, titulo: 'Película de ejemplo 1', descripcion: 'Reemplazar con datos de TMDB.', poster: null, fecha: '2024-01-01', calificacion: 7.5 },
  { tmdbId: 2, titulo: 'Película de ejemplo 2', descripcion: 'Reemplazar con datos de TMDB.', poster: null, fecha: '2023-06-15', calificacion: 8.1 },
  { tmdbId: 3, titulo: 'Película de ejemplo 3', descripcion: 'Reemplazar con datos de TMDB.', poster: null, fecha: '2022-11-20', calificacion: 6.9 },
]

export const recomendacionesService = {
  async obtener({ emocion, tipo }) {
    return {
      emocion,
      tipo,
      fuente: 'ejemplo',
      resultados: EJEMPLOS.map((item) => ({ ...item, tipo })),
    }
  },
}