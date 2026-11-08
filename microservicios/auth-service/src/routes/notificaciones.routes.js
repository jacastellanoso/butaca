import { Router } from 'express'

import {
  listarNotificaciones,
  marcarLeida,
  marcarTodas,
  registrarDelDia,
} from '../controllers/notificaciones.controller.js'
import { perfilActivo } from '../middlewares/perfilActivo.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const notificacionesRouter = Router()
notificacionesRouter.use(requireAuth, perfilActivo)
notificacionesRouter.get('/', listarNotificaciones)
notificacionesRouter.post('/leer-todas', marcarTodas)
notificacionesRouter.post('/del-dia', registrarDelDia)
notificacionesRouter.patch('/:id', marcarLeida)
