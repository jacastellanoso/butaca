import { prisma } from '../lib/prisma.js'

export const MAXIMO_PERFILES = 6

export const perfilSelect = {
  id: true, nombre: true, apellido: true, edad: true, avatar: true, esPrincipal: true, creadoEn: true,
}

export class PerfilError extends Error {
  constructor(status, mensaje) {
    super(mensaje)
    this.status = status
  }
}

// Todas las consultas filtran por propietarioId: una cuenta nunca ve ni
// modifica perfiles ajenos, aunque conozca su id.
export const perfilesService = {
  listar(usuarioId) {
    return prisma.perfil.findMany({
      where: { propietarioId: usuarioId },
      select: perfilSelect,
      orderBy: [{ esPrincipal: 'desc' }, { creadoEn: 'asc' }],
    })
  },

  async crear(usuarioId, { nombre, apellido, edad }) {
    const cantidad = await prisma.perfil.count({ where: { propietarioId: usuarioId } })
    if (cantidad >= MAXIMO_PERFILES) {
      throw new PerfilError(409, `Cada cuenta puede tener hasta ${MAXIMO_PERFILES} perfiles.`)
    }
    return prisma.perfil.create({
      data: { propietarioId: usuarioId, nombre, apellido, edad, esPrincipal: false },
      select: perfilSelect,
    })
  },

  async actualizar(usuarioId, id, cambios) {
    const actual = await prisma.perfil.findFirst({ where: { id, propietarioId: usuarioId }, select: perfilSelect })
    if (!actual) throw new PerfilError(404, 'El perfil no existe.')
    const perfil = await prisma.perfil.update({ where: { id }, data: cambios, select: perfilSelect })
    // El perfil principal refleja los datos de la cuenta (registro "Queremos conocerte").
    if (actual.esPrincipal) {
      await prisma.usuario.update({ where: { id: usuarioId }, data: cambios, select: { id: true } })
    }
    return perfil
  },

  /** Borra un perfil secundario y, en cascada, sus ánimos, favoritos e historial. */
  async eliminar(usuarioId, id) {
    const actual = await prisma.perfil.findFirst({ where: { id, propietarioId: usuarioId }, select: { esPrincipal: true } })
    if (!actual) throw new PerfilError(404, 'El perfil no existe.')
    if (actual.esPrincipal) throw new PerfilError(409, 'El perfil principal no se puede eliminar.')
    await prisma.perfil.deleteMany({ where: { id, propietarioId: usuarioId } })
  },
}
