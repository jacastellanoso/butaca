import { Router } from 'express'

import {
  agregarFavorito,
  eliminarFavorito,
  listarFavoritos,
} from '../controllers/favoritos.controller.js'
import { perfilActivo } from '../middlewares/perfilActivo.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const favoritosRouter = Router()

// Favoritos e historial pertenecen al perfil activo, no a toda la cuenta.
favoritosRouter.use(requireAuth, perfilActivo)

favoritosRouter.get('/', listarFavoritos)
favoritosRouter.post('/', agregarFavorito)
favoritosRouter.delete('/:id', eliminarFavorito)