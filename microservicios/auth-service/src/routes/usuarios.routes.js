import { Router } from 'express'

import { obtenerUsuario, sincronizarUsuario } from '../controllers/usuarios.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const usuariosRouter = Router()

usuariosRouter.post('/', requireAuth, sincronizarUsuario)
usuariosRouter.get('/', requireAuth, obtenerUsuario)
