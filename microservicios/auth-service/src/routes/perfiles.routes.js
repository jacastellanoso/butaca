import { Router } from 'express'

import { listarInvitaciones, responderInvitacion } from '../controllers/grupos.controller.js'
import { actualizarPerfil, crearPerfil, eliminarPerfil, listarPerfiles } from '../controllers/perfiles.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const perfilesRouter = Router()
perfilesRouter.use(requireAuth)
perfilesRouter.get('/', listarPerfiles)
perfilesRouter.post('/', crearPerfil)
perfilesRouter.patch('/:id', actualizarPerfil)
perfilesRouter.delete('/:id', eliminarPerfil)

// Invitaciones a grupos recibidas por la cuenta autenticada.
export const invitacionesRouter = Router()
invitacionesRouter.use(requireAuth)
invitacionesRouter.get('/', listarInvitaciones)
invitacionesRouter.put('/:id', responderInvitacion)
