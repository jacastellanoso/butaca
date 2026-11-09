import { Router } from 'express'

import {
  agregarFavorito,
  eliminarFavorito,
  listarFavoritos,
} from '../controllers/favoritos.controller.js'

export const favoritosRouter = Router()

favoritosRouter.get('/', listarFavoritos)
favoritosRouter.post('/', agregarFavorito)
favoritosRouter.delete('/:id', eliminarFavorito)