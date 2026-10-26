import { Router } from 'express'

import { requireAuth } from '../middlewares/requireAuth.js'
import { animosRouter } from './animos.routes.js'
import { favoritosRouter } from './favoritos.routes.js'
import { recomendacionesRouter } from './recomendaciones.routes.js'

export const apiRouter = Router()

// Pública: sirve para saber si el backend está vivo.
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Protegidas: todo lo de abajo exige sesión y trabaja con los datos de req.user.
apiRouter.use(requireAuth)
apiRouter.use('/animos', animosRouter)
apiRouter.use('/recomendaciones', recomendacionesRouter)
apiRouter.use('/favoritos', favoritosRouter)