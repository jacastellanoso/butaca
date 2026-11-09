/* import { randomUUID } from 'node:crypto'

// Almacenamiento TEMPORAL en memoria (se borra al reiniciar el servidor).
// pf7_Prisma reemplaza el cuerpo de estas funciones por consultas a la base;
// los controladores no tienen que cambiar.
const animosPorUsuario = new Map()

export const animosService = {
  async registrar(usuarioId, { emocion, confianza }) {
    const animo = {
      id: randomUUID(),
      emocion,
      confianza,
      creadoEn: new Date().toISOString(),
    }
    const lista = animosPorUsuario.get(usuarioId) ?? []
    lista.push(animo)
    animosPorUsuario.set(usuarioId, lista)
    return animo
  },

  async listar(usuarioId) {
    return animosPorUsuario.get(usuarioId) ?? []
  },
}*/

import { prisma } from '../lib/prisma.js'

const animoSelect = {
  id: true,
  emocion: true,
  confianza: true,
  creadoEn: true,
}

export const animosService = {
  async registrar(usuarioId, { emocion, confianza }) {
    await prisma.usuario.upsert({
      where: { id: usuarioId },
      update: {},
      create: { id: usuarioId },
    })

    return prisma.animo.create({
      data: {
        usuarioId,
        emocion,
        confianza,
      },
      select: animoSelect,
    })
  },

  async listar(usuarioId) {
    return prisma.animo.findMany({
      where: { usuarioId },
      orderBy: { creadoEn: 'desc' },
      take: 100,
      select: animoSelect,
    })
  },
}