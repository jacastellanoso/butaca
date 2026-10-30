import { Router } from 'express'

import { obtenerSesion } from '../controllers/sesiones.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const sesionesRouter = Router()

sesionesRouter.get('/', requireAuth, obtenerSesion)
