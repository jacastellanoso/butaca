import { prisma } from '../lib/prisma.js'

const perfilSelect = { id: true, nombre: true, avatar: true, esPrincipal: true, creadoEn: true }

export async function listarPerfiles(req, res) {
  try {
    const propios = await prisma.perfil.findMany({ where: { propietarioId: req.user.id }, select: perfilSelect, orderBy: [{ esPrincipal: 'desc' }, { creadoEn: 'asc' }] })
    const vinculos = await prisma.invitacionPerfil.findMany({
      where: { estado: 'aceptada', OR: [{ remitenteId: req.user.id }, { destinatarioId: req.user.id }] },
      include: {
        remitente: { select: { id: true, perfiles: { where: { esPrincipal: true }, select: perfilSelect } } },
        destinatario: { select: { id: true, perfiles: { where: { esPrincipal: true }, select: perfilSelect } } },
      },
    })
    const amigos = vinculos.flatMap((v) => (v.remitenteId === req.user.id ? v.destinatario.perfiles : v.remitente.perfiles))
    return res.json([...propios.map((p) => ({ ...p, tipo: 'propio' })), ...amigos.map((p) => ({ ...p, tipo: 'amigo' }))])
  } catch { return res.status(500).json({ error: 'No se pudieron consultar los perfiles.' }) }
}

export async function crearPerfil(req, res) {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : ''
  if (nombre.length < 2 || nombre.length > 60) return res.status(400).json({ error: 'El nombre debe tener entre 2 y 60 caracteres.' })
  try {
    const perfil = await prisma.perfil.create({ data: { propietarioId: req.user.id, nombre }, select: perfilSelect })
    return res.status(201).json({ ...perfil, tipo: 'propio' })
  } catch { return res.status(500).json({ error: 'No se pudo crear el perfil.' }) }
}

export async function listarInvitaciones(req, res) {
  try {
    const lista = await prisma.invitacionPerfil.findMany({ where: { destinatarioId: req.user.id, estado: 'pendiente' }, include: { remitente: { select: { email: true, nombre: true, apellido: true } } }, orderBy: { creadoEn: 'desc' } })
    return res.json(lista.map((i) => ({ id: i.id, email: i.remitente.email, nombre: [i.remitente.nombre, i.remitente.apellido].filter(Boolean).join(' ') || i.remitente.email, creadoEn: i.creadoEn })))
  } catch { return res.status(500).json({ error: 'No se pudieron consultar las invitaciones.' }) }
}

export async function invitar(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Ingresá un correo válido.' })
  try {
    const destino = await prisma.usuario.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })
    if (!destino || destino.id === req.user.id) return res.status(404).json({ error: 'No encontramos otra cuenta de Butaca con ese correo.' })
    const invitacion = await prisma.invitacionPerfil.upsert({ where: { remitenteId_destinatarioId: { remitenteId: req.user.id, destinatarioId: destino.id } }, create: { remitenteId: req.user.id, destinatarioId: destino.id }, update: { estado: 'pendiente', creadoEn: new Date() }, select: { id: true, estado: true, creadoEn: true } })
    return res.status(201).json(invitacion)
  } catch { return res.status(500).json({ error: 'No se pudo enviar la invitación.' }) }
}

export async function responderInvitacion(req, res) {
  const estado = req.body?.aceptar === true ? 'aceptada' : req.body?.aceptar === false ? 'rechazada' : null
  if (!estado) return res.status(400).json({ error: 'Indicá si aceptás o rechazás la invitación.' })
  try {
    const resultado = await prisma.invitacionPerfil.updateMany({ where: { id: req.params.id, destinatarioId: req.user.id, estado: 'pendiente' }, data: { estado } })
    return resultado.count ? res.json({ estado }) : res.status(404).json({ error: 'La invitación no existe.' })
  } catch { return res.status(500).json({ error: 'No se pudo responder la invitación.' }) }
}
