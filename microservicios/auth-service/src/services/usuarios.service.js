import { prisma } from '../lib/prisma.js'

const usuarioSelect = { id: true, email: true, creadoEn: true }

export const usuariosService = {
  async sincronizar({ id, email }) {
    return prisma.usuario.upsert({
      where: { id },
      create: { id, email: email ?? null },
      update: { email: email ?? null },
      select: usuarioSelect,
    })
  },

  async obtener(id) {
    return prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    })
  },
}
