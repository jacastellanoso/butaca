import '../config/env.js'
import { PrismaClient } from '@prisma/client'

// Instancia única de PrismaClient compartida por los servicios del backend.
export const prisma = new PrismaClient()