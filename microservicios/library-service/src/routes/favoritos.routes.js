import { Router } from 'express'

import {
  agregarFavorito,
  eliminarFavorito,
  listarFavoritos,
} from '../controllers/favoritos.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const favoritosRouter = Router()

favoritosRouter.use(requireAuth)

favoritosRouter.get('/', listarFavoritos)
favoritosRouter.post('/', agregarFavorito)
favoritosRouter.delete('/:id', eliminarFavorito)