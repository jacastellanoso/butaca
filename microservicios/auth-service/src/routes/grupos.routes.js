import { Router } from 'express'

import {
  cancelarInvitacion,
  compartirRecomendacion,
  crearGrupo,
  eliminarGrupo,
  invitarAlGrupo,
  listarGrupos,
  obtenerGrupo,
  quitarMiembro,
} from '../controllers/grupos.controller.js'
import { perfilActivo } from '../middlewares/perfilActivo.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const gruposRouter = Router()
gruposRouter.use(requireAuth, perfilActivo)
gruposRouter.get('/', listarGrupos)
gruposRouter.post('/', crearGrupo)
gruposRouter.get('/:id', obtenerGrupo)
gruposRouter.delete('/:id', eliminarGrupo)
gruposRouter.post('/:id/invitaciones', invitarAlGrupo)
gruposRouter.delete('/:id/invitaciones/:invitacionId', cancelarInvitacion)
gruposRouter.delete('/:id/miembros/:usuarioId', quitarMiembro)
gruposRouter.post('/:id/recomendaciones', compartirRecomendacion)
