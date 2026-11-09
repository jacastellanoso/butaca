import { env } from './env.js'

// Por defecto toda ruta exige `Authorization: Bearer <token>` en el gateway
// (pf23). Solo las marcadas con `publico: true` pasan sin token.
export const services = [
  {
    name: 'auth-service',
    description: 'Sesiones, usuarios, perfiles, grupos, invitaciones y notificaciones',
    target: env.authServiceUrl,
    paths: ['/api/sesiones', '/api/usuarios', '/api/perfiles', '/api/invitaciones', '/api/grupos', '/api/notificaciones'],
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
    // El catálogo de TMDB es público: se puede explorar sin iniciar sesión.
    publico: true,
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
