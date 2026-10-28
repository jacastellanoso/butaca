import { env } from './env.js'

export const services = [
  {
    name: 'auth-service',
    description: 'Sesiones de Supabase e información del usuario',
    target: env.authServiceUrl,
    paths: ['/api/sesiones', '/api/usuarios'],
  },
  {
    name: 'emotions-service',
    description: 'Resultados emocionales autorizados',
    target: env.emotionsServiceUrl,
    paths: ['/api/animos'],
  },
  {
    name: 'catalog-service',
    description: 'Películas, series y detalles de TMDB',
    target: env.catalogServiceUrl,
    paths: ['/api/catalogo'],
  },
  {
    name: 'recommendations-service',
    description: 'Relación entre emociones y recomendaciones',
    target: env.recommendationsServiceUrl,
    paths: ['/api/recomendaciones'],
  },
  {
    name: 'library-service',
    description: 'Favoritos e historial de recomendaciones',
    target: env.libraryServiceUrl,
    paths: ['/api/favoritos', '/api/historial'],
  },
]
