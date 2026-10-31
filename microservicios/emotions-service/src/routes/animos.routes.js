import { Router } from 'express'

import { listarAnimos, obtenerAnimo, registrarAnimo } from '../controllers/animos.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const animosRouter = Router()

// Todas las rutas exigen sesión: el usuario sale siempre de req.user.
animosRouter.use(requireAuth)

animosRouter.post('/', registrarAnimo)
animosRouter.get('/', listarAnimos)
animosRouter.get('/:id', obtenerAnimo)
