import { Router } from 'express'

import { obtenerRecomendaciones } from '../controllers/recomendaciones.controller.js'

export const recomendacionesRouter = Router()

recomendacionesRouter.get('/', obtenerRecomendaciones)