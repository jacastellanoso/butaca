import { Router } from 'express'

import {
  eliminarHistorial,
  listarHistorial,
  registrarHistorial,
} from '../controllers/historial.controller.js'
import { perfilActivo } from '../middlewares/perfilActivo.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const historialRouter = Router()

// Favoritos e historial pertenecen al perfil activo, no a toda la cuenta.
historialRouter.use(requireAuth, perfilActivo)

historialRouter.get('/', listarHistorial)
historialRouter.post('/', registrarHistorial)
historialRouter.delete('/:id', eliminarHistorial)