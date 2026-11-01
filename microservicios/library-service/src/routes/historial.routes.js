import { Router } from 'express'

import {
  eliminarHistorial,
  listarHistorial,
  registrarHistorial,
} from '../controllers/historial.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const historialRouter = Router()

historialRouter.use(requireAuth)

historialRouter.get('/', listarHistorial)
historialRouter.post('/', registrarHistorial)
historialRouter.delete('/:id', eliminarHistorial)