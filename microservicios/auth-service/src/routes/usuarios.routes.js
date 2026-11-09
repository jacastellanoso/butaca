import { Router } from 'express'

import { actualizarUsuario, obtenerUsuario, sincronizarUsuario } from '../controllers/usuarios.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const usuariosRouter = Router()

usuariosRouter.post('/', requireAuth, sincronizarUsuario)
usuariosRouter.get('/', requireAuth, obtenerUsuario)
usuariosRouter.put('/', requireAuth, actualizarUsuario)
