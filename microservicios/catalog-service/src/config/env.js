import 'dotenv/config'

// Único lugar donde se lee process.env en este microservicio.
export const env = {
  serviceName: process.env.SERVICE_NAME ?? 'catalog-service',
  port: Number(process.env.PORT) || 3023,
  tmdbApiKey: (process.env.TMDB_API_KEY ?? '').trim(),
  tmdbBaseUrl: (process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3').replace(/\/+$/, ''),
  tmdbImageBaseUrl: (process.env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p/w500').replace(/\/+$/, ''),
  tmdbTimeoutMs: Number(process.env.TMDB_TIMEOUT_MS) || 5000,
}