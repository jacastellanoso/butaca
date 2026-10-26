import express from 'express'

import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { apiRouter } from './routes/index.js'

// app.js crea y configura Express, pero NO hace listen:
// así las pruebas (supertest) usan el app sin ocupar un puerto.
export const app = express()

// pf16_Seguridad agrega acá helmet, cors y rate limit (antes de las rutas).
app.use(express.json())

app.use('/api', apiRouter)

app.use(notFound)
app.use(errorHandler)