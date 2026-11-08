import { prisma } from '../lib/prisma.js'
import { nombreVisible, notificacionesService } from './notificaciones.service.js'

export class GrupoError extends Error {
  constructor(status, mensaje) {
    super(mensaje)
    this.status = status
  }
}

const usuarioPublico = { id: true, email: true, nombre: true, apellido: true }
const invitacionSelect = {
  id: true, grupoId: true, remitenteId: true, email: true, destinatarioId: true, estado: true, creadoEn: true,
}
const recomendacionSelect = {
  id: true, autorId: true, autorNombre: true, destinatarioId: true, tmdbId: true, tipo: true,
  titulo: true, poster: true, mensaje: true, creadoEn: true,
}
const MAXIMO_MIEMBROS = 20

const correo = (usuario) => (usuario?.email ?? '').trim().toLowerCase()

async function usuariosPorId(ids, db = prisma) {
  const unicos = [...new Set(ids.filter(Boolean))]
  if (unicos.length === 0) return new Map()
  const lista = await db.usuario.findMany({ where: { id: { in: unicos } }, select: usuarioPublico })
  return new Map(lista.map((u) => [u.id, u]))
}

async function exigirMiembro(usuarioId, grupoId) {
  const miembro = await prisma.miembroGrupo.findFirst({ where: { grupoId, usuarioId }, select: { rol: true } })
  if (!miembro) throw new GrupoError(404, 'El grupo no existe o no formás parte de él.')
  const grupo = await prisma.grupo.findFirst({
    where: { id: grupoId }, select: { id: true, nombre: true, descripcion: true, propietarioId: true, creadoEn: true },
  })
  if (!grupo) throw new GrupoError(404, 'El grupo no existe o no formás parte de él.')
  return { grupo, rol: miembro.rol }
}

/** Pendientes dirigidas a la cuenta (por id o por su correo, aunque aún no se hubieran vinculado). */
function dirigidasA(usuario) {
  const email = correo(usuario)
  return email ? [{ destinatarioId: usuario.id }, { email }] : [{ destinatarioId: usuario.id }]
}

export const gruposService = {
  async listar(usuarioId) {
    const membresias = await prisma.miembroGrupo.findMany({ where: { usuarioId }, select: { grupoId: true, rol: true } })
    if (membresias.length === 0) return []
    const ids = membresias.map((m) => m.grupoId)
    const [grupos, miembros] = await Promise.all([
      prisma.grupo.findMany({
        where: { id: { in: ids } },
        select: { id: true, nombre: true, descripcion: true, creadoEn: true },
        orderBy: [{ creadoEn: 'desc' }],
      }),
      prisma.miembroGrupo.findMany({ where: { grupoId: { in: ids } }, select: { grupoId: true } }),
    ])
    const rol = new Map(membresias.map((m) => [m.grupoId, m.rol]))
    return grupos.map((g) => ({
      ...g,
      rol: rol.get(g.id),
      miembros: miembros.filter((m) => m.grupoId === g.id).length,
    }))
  },

  async crear(usuarioId, { nombre, descripcion }) {
    return prisma.$transaction(async (tx) => {
      const grupo = await tx.grupo.create({
        data: { nombre, descripcion, propietarioId: usuarioId },
        select: { id: true, nombre: true, descripcion: true, creadoEn: true },
      })
      await tx.miembroGrupo.create({ data: { grupoId: grupo.id, usuarioId, rol: 'propietario' }, select: { id: true } })
      return { ...grupo, rol: 'propietario', miembros: 1 }
    })
  },

  async detalle(usuarioId, grupoId) {
    const { grupo, rol } = await exigirMiembro(usuarioId, grupoId)
    const [miembros, invitaciones, recomendaciones] = await Promise.all([
      prisma.miembroGrupo.findMany({
        where: { grupoId }, select: { usuarioId: true, rol: true, creadoEn: true }, orderBy: [{ creadoEn: 'asc' }],
      }),
      prisma.invitacionGrupo.findMany({
        where: { grupoId, estado: 'pendiente' }, select: invitacionSelect, orderBy: [{ creadoEn: 'desc' }],
      }),
      // Cada integrante ve lo compartido con todo el grupo, lo dirigido a él y lo que él envió.
      prisma.recomendacionGrupo.findMany({
        where: { grupoId, OR: [{ destinatarioId: null }, { destinatarioId: usuarioId }, { autorId: usuarioId }] },
        select: recomendacionSelect,
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        take: 50,
      }),
    ])
    const usuarios = await usuariosPorId([
      ...miembros.map((m) => m.usuarioId),
      ...recomendaciones.map((r) => r.destinatarioId),
    ])
    return {
      ...grupo,
      rol,
      miembros: miembros.map((m) => {
        const u = usuarios.get(m.usuarioId)
        return { usuarioId: m.usuarioId, nombre: nombreVisible(u), email: u?.email ?? null, rol: m.rol, esYo: m.usuarioId === usuarioId, desde: m.creadoEn }
      }),
      invitaciones: invitaciones.map(({ id, email, creadoEn, remitenteId }) => ({ id, email, creadoEn, puedoCancelar: rol === 'propietario' || remitenteId === usuarioId })),
      recomendaciones: recomendaciones.map((r) => ({
        ...r,
        esMia: r.autorId === usuarioId,
        destinatarioNombre: r.destinatarioId ? nombreVisible(usuarios.get(r.destinatarioId)) : null,
      })),
    }
  },

  async eliminar(usuarioId, grupoId) {
    const { grupo, rol } = await exigirMiembro(usuarioId, grupoId)
    if (rol !== 'propietario') throw new GrupoError(403, 'Solo quien creó el grupo puede eliminarlo.')
    const miembros = await prisma.miembroGrupo.findMany({ where: { grupoId }, select: { usuarioId: true } })
    await prisma.grupo.delete({ where: { id: grupoId } })
    await notificacionesService.notificar(miembros.filter((m) => m.usuarioId !== usuarioId).map((m) => ({
      usuarioId: m.usuarioId,
      tipo: 'grupo-eliminado',
      titulo: 'Un grupo fue eliminado',
      mensaje: `El grupo «${grupo.nombre}» ya no existe.`,
      datos: { grupoNombre: grupo.nombre },
    })))
  },

  async invitar(usuario, autorNombre, grupoId, email) {
    const { grupo } = await exigirMiembro(usuario.id, grupoId)
    if (email === correo(usuario)) throw new GrupoError(400, 'No podés invitarte a vos mismo.')

    const destinatario = await prisma.usuario.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true },
    })
    const miembros = await prisma.miembroGrupo.findMany({ where: { grupoId }, select: { usuarioId: true } })
    if (destinatario && miembros.some((m) => m.usuarioId === destinatario.id)) {
      throw new GrupoError(409, 'Esa persona ya forma parte del grupo.')
    }
    if (miembros.length >= MAXIMO_MIEMBROS) throw new GrupoError(409, `Un grupo puede tener hasta ${MAXIMO_MIEMBROS} integrantes.`)

    const invitacion = await prisma.invitacionGrupo.upsert({
      where: { grupoId_email: { grupoId, email } },
      create: { grupoId, email, remitenteId: usuario.id, destinatarioId: destinatario?.id ?? null },
      update: { estado: 'pendiente', remitenteId: usuario.id, destinatarioId: destinatario?.id ?? null, creadoEn: new Date(), respondidoEn: null },
      select: invitacionSelect,
    })
    if (destinatario) {
      await notificacionesService.notificar([{
        usuarioId: destinatario.id,
        tipo: 'invitacion-grupo',
        titulo: 'Te invitaron a un grupo',
        mensaje: `${autorNombre} te invitó a «${grupo.nombre}».`,
        datos: { invitacionId: invitacion.id, grupoId, grupoNombre: grupo.nombre, remitente: autorNombre, estado: 'pendiente' },
      }])
    }
    return { id: invitacion.id, email: invitacion.email, estado: invitacion.estado, creadoEn: invitacion.creadoEn, registrado: Boolean(destinatario) }
  },

  async cancelarInvitacion(usuarioId, grupoId, invitacionId) {
    const { rol } = await exigirMiembro(usuarioId, grupoId)
    const where = { id: invitacionId, grupoId, estado: 'pendiente', ...(rol === 'propietario' ? {} : { remitenteId: usuarioId }) }
    const { count } = await prisma.invitacionGrupo.updateMany({ where, data: { estado: 'cancelada', respondidoEn: new Date() } })
    if (!count) throw new GrupoError(404, 'La invitación no existe o ya fue respondida.')
  },

  /** El propietario quita a un integrante; un integrante puede salir por su cuenta. */
  async quitarMiembro(usuarioId, grupoId, objetivoId) {
    const { grupo, rol } = await exigirMiembro(usuarioId, grupoId)
    const saliendo = objetivoId === usuarioId
    if (saliendo && rol === 'propietario') {
      throw new GrupoError(409, 'Quien creó el grupo no puede salir: puede eliminarlo.')
    }
    if (!saliendo && rol !== 'propietario') throw new GrupoError(403, 'Solo quien creó el grupo puede quitar integrantes.')
    const { count } = await prisma.miembroGrupo.deleteMany({ where: { grupoId, usuarioId: objetivoId, rol: 'miembro' } })
    if (!count) throw new GrupoError(404, 'Esa persona no forma parte del grupo.')
    await notificacionesService.notificar([saliendo
      ? { usuarioId: grupo.propietarioId, tipo: 'miembro-salio', titulo: 'Alguien salió de tu grupo', mensaje: `Un integrante salió de «${grupo.nombre}».`, datos: { grupoId, grupoNombre: grupo.nombre } }
      : { usuarioId: objetivoId, tipo: 'miembro-removido', titulo: 'Ya no formás parte de un grupo', mensaje: `Te quitaron de «${grupo.nombre}».`, datos: { grupoNombre: grupo.nombre } },
    ])
  },

  async compartir(usuarioId, perfilId, autorNombre, grupoId, datos) {
    const { grupo } = await exigirMiembro(usuarioId, grupoId)
    const miembros = await prisma.miembroGrupo.findMany({ where: { grupoId }, select: { usuarioId: true } })
    if (datos.destinatarioId) {
      if (datos.destinatarioId === usuarioId) throw new GrupoError(400, 'Elegí a otra persona del grupo.')
      if (!miembros.some((m) => m.usuarioId === datos.destinatarioId)) {
        throw new GrupoError(400, 'Esa persona no forma parte del grupo.')
      }
    }
    const recomendacion = await prisma.recomendacionGrupo.create({
      data: { grupoId, autorId: usuarioId, autorPerfilId: perfilId, autorNombre, ...datos },
      select: recomendacionSelect,
    })
    const destinatarios = datos.destinatarioId
      ? [datos.destinatarioId]
      : miembros.map((m) => m.usuarioId).filter((id) => id !== usuarioId)
    await notificacionesService.notificar(destinatarios.map((id) => ({
      usuarioId: id,
      tipo: 'recomendacion-compartida',
      titulo: `${autorNombre} te recomendó algo`,
      mensaje: `«${datos.titulo}» en ${grupo.nombre}${datos.mensaje ? `: “${datos.mensaje}”` : '.'}`,
      datos: { grupoId, grupoNombre: grupo.nombre, recomendacionId: recomendacion.id, tmdbId: datos.tmdbId, tipo: datos.tipo, titulo: datos.titulo, poster: datos.poster, autor: autorNombre },
    })))
    return { ...recomendacion, esMia: true, destinatarioNombre: null }
  },

  async invitacionesRecibidas(usuario) {
    const lista = await prisma.invitacionGrupo.findMany({
      where: { estado: 'pendiente', OR: dirigidasA(usuario) }, select: invitacionSelect, orderBy: [{ creadoEn: 'desc' }],
    })
    if (lista.length === 0) return []
    const [grupos, remitentes] = await Promise.all([
      prisma.grupo.findMany({ where: { id: { in: lista.map((i) => i.grupoId) } }, select: { id: true, nombre: true } }),
      usuariosPorId(lista.map((i) => i.remitenteId)),
    ])
    const nombres = new Map(grupos.map((g) => [g.id, g.nombre]))
    return lista.map((i) => ({
      id: i.id, grupoId: i.grupoId, grupoNombre: nombres.get(i.grupoId) ?? 'Grupo',
      remitente: nombreVisible(remitentes.get(i.remitenteId)), creadoEn: i.creadoEn,
    }))
  },

  async responder(usuario, invitacionId, aceptar) {
    const invitacion = await prisma.invitacionGrupo.findFirst({
      where: { id: invitacionId, estado: 'pendiente', OR: dirigidasA(usuario) }, select: invitacionSelect,
    })
    if (!invitacion) throw new GrupoError(404, 'La invitación no existe o ya fue respondida.')
    const grupo = await prisma.grupo.findFirst({ where: { id: invitacion.grupoId }, select: { id: true, nombre: true } })
    if (!grupo) throw new GrupoError(404, 'El grupo ya no existe.')
    const estado = aceptar ? 'aceptada' : 'rechazada'

    await prisma.$transaction(async (tx) => {
      await tx.invitacionGrupo.update({
        where: { id: invitacion.id }, data: { estado, destinatarioId: usuario.id, respondidoEn: new Date() }, select: { id: true },
      })
      if (aceptar) {
        const yaEs = await tx.miembroGrupo.findFirst({ where: { grupoId: grupo.id, usuarioId: usuario.id }, select: { id: true } })
        if (!yaEs) await tx.miembroGrupo.create({ data: { grupoId: grupo.id, usuarioId: usuario.id, rol: 'miembro' }, select: { id: true } })
      }
    })

    const yo = await prisma.usuario.findFirst({ where: { id: usuario.id }, select: usuarioPublico })
    await notificacionesService.notificar([{
      usuarioId: invitacion.remitenteId,
      tipo: aceptar ? 'invitacion-aceptada' : 'invitacion-rechazada',
      titulo: aceptar ? 'Invitación aceptada' : 'Invitación rechazada',
      mensaje: `${nombreVisible(yo ?? usuario)} ${aceptar ? 'se unió a' : 'rechazó la invitación a'} «${grupo.nombre}».`,
      datos: { grupoId: grupo.id, grupoNombre: grupo.nombre, invitacionId: invitacion.id },
    }])

    // La notificación de la invitación queda leída y con su estado final.
    const avisos = await prisma.notificacion.findMany({
      where: { usuarioId: usuario.id, tipo: 'invitacion-grupo' }, select: { id: true, datos: true },
    })
    for (const aviso of avisos.filter((a) => a.datos?.invitacionId === invitacion.id)) {
      await prisma.notificacion.update({ where: { id: aviso.id }, data: { leida: true, datos: { ...aviso.datos, estado } }, select: { id: true } })
    }
    return { estado, grupoId: grupo.id }
  },

  /**
   * Al iniciar sesión, las invitaciones enviadas al correo de la cuenta antes
   * de que existiera quedan vinculadas y se notifican.
   */
  async vincularInvitaciones(usuario) {
    const email = correo(usuario)
    if (!email) return 0
    const pendientes = await prisma.invitacionGrupo.findMany({
      where: { email, destinatarioId: null, estado: 'pendiente' }, select: invitacionSelect,
    })
    if (pendientes.length === 0) return 0
    await prisma.invitacionGrupo.updateMany({
      where: { id: { in: pendientes.map((i) => i.id) } }, data: { destinatarioId: usuario.id },
    })
    const [grupos, remitentes] = await Promise.all([
      prisma.grupo.findMany({ where: { id: { in: pendientes.map((i) => i.grupoId) } }, select: { id: true, nombre: true } }),
      usuariosPorId(pendientes.map((i) => i.remitenteId)),
    ])
    const nombres = new Map(grupos.map((g) => [g.id, g.nombre]))
    await notificacionesService.notificar(pendientes.map((i) => {
      const remitente = nombreVisible(remitentes.get(i.remitenteId))
      return {
        usuarioId: usuario.id,
        tipo: 'invitacion-grupo',
        titulo: 'Te invitaron a un grupo',
        mensaje: `${remitente} te invitó a «${nombres.get(i.grupoId) ?? 'un grupo'}».`,
        datos: { invitacionId: i.id, grupoId: i.grupoId, grupoNombre: nombres.get(i.grupoId) ?? 'Grupo', remitente, estado: 'pendiente' },
      }
    }))
    return pendientes.length
  },
}
