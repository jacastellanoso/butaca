import { Router } from 'express'

import {
  listarCatalogo,
  obtenerDetalleCatalogo,
} from '../controllers/catalogo.controller.js'

export const catalogoRouter = Router()

catalogoRouter.get('/', listarCatalogo)
catalogoRouter.get('/:tipo/:tmdbId', obtenerDetalleCatalogo)