import { prisma } from '../lib/prisma.js'

const usuarioSelect = { id: true, email: true, nombre: true, apellido: true, edad: true, creadoEn: true }

export const usuariosService = {
  /**
   * Alta o recuperación idempotente del usuario autenticado (cada inicio de sesión).
   * - Si ya existe, se devuelve tal cual: no se reescribe nada, así un nuevo
   *   ingreso nunca toca perfiles, favoritos ni historial. Solo se actualiza el
   *   correo si el que informa Supabase cambió.
   * - Si no existe, se crea (el trigger crea su perfil principal).
   * - Si dos pestañas o reintentos crean la cuenta a la vez, el segundo INSERT
   *   choca con la clave primaria (P2002): se recupera el registro ya creado.
   */
  async sincronizar({ id, email }) {
    const correo = email ?? null
    const existente = await prisma.usuario.findUnique({ where: { id }, select: usuarioSelect })
    if (existente) {
      if (existente.email === correo) return existente
      return prisma.usuario.update({ where: { id }, data: { email: correo }, select: usuarioSelect })
    }

    try {
      return await prisma.usuario.create({ data: { id, email: correo }, select: usuarioSelect })
    } catch (error) {
      if (error?.code !== 'P2002') throw error
      const creado = await prisma.usuario.findUnique({ where: { id }, select: usuarioSelect })
      if (!creado) throw error
      return creado
    }
  },

  async obtener(id) {
    return prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    })
  },

  async actualizarNombre(id, { nombre, apellido, edad }) {
    return prisma.usuario.update({
      where: { id },
      data: { nombre, apellido, edad },
      select: usuarioSelect,
    })
  },
}
