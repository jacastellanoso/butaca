import { Router } from 'express'

import { listarAnimos, obtenerAnimo, registrarAnimo } from '../controllers/animos.controller.js'
import { perfilActivo } from '../middlewares/perfilActivo.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const animosRouter = Router()

// Todas las rutas exigen sesión: el usuario sale siempre de req.user.
// El perfil activo separa los registros de cada persona de la misma cuenta.
animosRouter.use(requireAuth, perfilActivo)

animosRouter.post('/', registrarAnimo)
animosRouter.get('/', listarAnimos)
animosRouter.get('/:id', obtenerAnimo)
