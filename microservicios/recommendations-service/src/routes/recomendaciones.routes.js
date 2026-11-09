import { Router } from 'express'
import { crearRequireAuth } from '../middlewares/requireAuth.js'
import { crearObtenerRecomendaciones } from '../controllers/recomendaciones.controller.js'

export function crearRecomendacionesRouter(config) {
  const router = Router()
  router.get('/', crearRequireAuth(config), crearObtenerRecomendaciones(config))
  return router
}
