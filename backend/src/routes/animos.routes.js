import { Router } from 'express'

import { listarAnimos, registrarAnimo } from '../controllers/animos.controller.js'

export const animosRouter = Router()

animosRouter.get('/', listarAnimos)
animosRouter.post('/', registrarAnimo)