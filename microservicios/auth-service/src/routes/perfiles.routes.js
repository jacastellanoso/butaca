import { Router } from 'express'
import { requireAuth } from '../middlewares/requireAuth.js'
import { crearPerfil, invitar, listarInvitaciones, listarPerfiles, responderInvitacion } from '../controllers/perfiles.controller.js'

export const perfilesRouter = Router()
perfilesRouter.use(requireAuth)
perfilesRouter.get('/', listarPerfiles)
perfilesRouter.post('/', crearPerfil)

export const invitacionesRouter = Router()
invitacionesRouter.use(requireAuth)
invitacionesRouter.get('/', listarInvitaciones)
invitacionesRouter.post('/', invitar)
invitacionesRouter.put('/:id', responderInvitacion)
