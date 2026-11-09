import '../config/env.js'
import { PrismaClient } from '@prisma/client'

// Instancia única por proceso. Prisma conecta al ejecutar la primera consulta.
export const prisma = new PrismaClient()
