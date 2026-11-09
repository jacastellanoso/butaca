// Parte "social" del backend falso: perfiles, grupos, invitaciones y
// notificaciones, con el mismo contrato que auth-service (/api/perfiles,
// /api/grupos, /api/invitaciones, /api/notificaciones). La persona con sesión
// en el navegador es USUARIO_PRUEBA; las demás cuentas solo existen aquí para
// simular que otra persona invita, acepta o comparte.

import { randomUUID } from 'node:crypto'


export const OTRAS_CUENTAS = {
  leo: { id: '22222222-2222-4222-8222-222222222222', email: 'leo@butaca.test', nombre: 'Leo', apellido: 'Ruiz' },
  sofi: { id: '33333333-3333-4333-8333-333333333333', email: 'sofi@butaca.test', nombre: 'Sofi', apellido: 'Paz' },
}

const ahora = () => new Date().toISOString()
const nombreDe = (cuenta) => [cuenta?.nombre, cuenta?.apellido].filter(Boolean).join(' ') || cuenta?.email?.split('@')[0] || 'Alguien'

export class SocialFalso {
  constructor(usuario) {
    this.yo = usuario
    this.cuentas = new Map([[usuario.id, usuario], ...Object.values(OTRAS_CUENTAS).map((c) => [c.id, c])])
    // Perfil principal de la cuenta con sesión (lo crea un trigger en la base real).
    this.perfiles = [{
      id: randomUUID(), propietarioId: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido,
      edad: usuario.edad ?? null, avatar: null, esPrincipal: true, creadoEn: '2026-10-01T12:00:00.000Z',
    }]
    this.grupos = []
    this.miembros = []
    this.invitaciones = []
    this.recomendaciones = []
    this.notificaciones = []
  }

  get principal() {
    return this.perfiles.find((p) => p.propietarioId === this.yo.id && p.esPrincipal)
  }

  /** Perfil de la petición: el del encabezado si es propio; si no hay encabezado, el principal. */
  perfilDe(encabezado) {
    if (!encabezado) return { perfil: this.principal }
    const perfil = this.perfiles.find((p) => p.id === encabezado && p.propietarioId === this.yo.id)
    return perfil ? { perfil } : { status: 403, error: 'El perfil indicado no pertenece a tu cuenta.' }
  }

  perfilesDe(usuarioId) {
    return this.perfiles.filter((p) => p.propietarioId === usuarioId)
      .sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal) || a.creadoEn.localeCompare(b.creadoEn))
  }

  notificar(usuarioId, tipo, titulo, mensaje, datos = {}, extra = {}) {
    const notificacion = { id: randomUUID(), usuarioId, perfilId: null, tipo, titulo, mensaje, datos, leida: false, creadoEn: ahora(), ...extra }
    this.notificaciones.unshift(notificacion)
    return notificacion
  }

  notificacionesPara(perfilId) {
    return this.notificaciones.filter((n) => n.usuarioId === this.yo.id && (n.perfilId === null || n.perfilId === perfilId))
  }

  // ── Acciones de OTRAS cuentas (para las pruebas) ─────────────────────────

  /** Otra cuenta crea un grupo e invita a la persona con sesión. */
  invitarAlUsuario({ desde = 'leo', grupo = 'Club de cine' } = {}) {
    const remitente = OTRAS_CUENTAS[desde]
    const nuevo = { id: randomUUID(), nombre: grupo, descripcion: null, propietarioId: remitente.id, creadoEn: ahora() }
    this.grupos.push(nuevo)
    this.miembros.push({ grupoId: nuevo.id, usuarioId: remitente.id, rol: 'propietario', creadoEn: ahora() })
    const invitacion = { id: randomUUID(), grupoId: nuevo.id, remitenteId: remitente.id, email: this.yo.email, destinatarioId: this.yo.id, estado: 'pendiente', creadoEn: ahora() }
    this.invitaciones.push(invitacion)
    this.notificar(this.yo.id, 'invitacion-grupo', 'Te invitaron a un grupo', `${nombreDe(remitente)} te invitó a «${grupo}».`, {
      invitacionId: invitacion.id, grupoId: nuevo.id, grupoNombre: grupo, remitente: nombreDe(remitente), estado: 'pendiente',
    })
    return { grupo: nuevo, invitacion }
  }

  /** Otra cuenta responde una invitación que le envió la persona con sesión. */
  responderComo(clave, aceptar) {
    const cuenta = OTRAS_CUENTAS[clave]
    const invitacion = this.invitaciones.find((i) => i.email === cuenta.email && i.estado === 'pendiente')
    if (!invitacion) throw new Error(`No hay invitación pendiente para ${cuenta.email}`)
    invitacion.estado = aceptar ? 'aceptada' : 'rechazada'
    invitacion.destinatarioId = cuenta.id
    if (aceptar) this.miembros.push({ grupoId: invitacion.grupoId, usuarioId: cuenta.id, rol: 'miembro', creadoEn: ahora() })
    const grupo = this.grupos.find((g) => g.id === invitacion.grupoId)
    this.notificar(invitacion.remitenteId, aceptar ? 'invitacion-aceptada' : 'invitacion-rechazada',
      aceptar ? 'Invitación aceptada' : 'Invitación rechazada',
      `${nombreDe(cuenta)} ${aceptar ? 'se unió a' : 'rechazó la invitación a'} «${grupo.nombre}».`,
      { grupoId: grupo.id, grupoNombre: grupo.nombre, invitacionId: invitacion.id })
  }

  /** Otra cuenta comparte un contenido en un grupo del que forma parte. */
  compartirComo(clave, grupoId, { tmdbId, tipo, titulo, mensaje = null }) {
    const cuenta = OTRAS_CUENTAS[clave]
    const grupo = this.grupos.find((g) => g.id === grupoId)
    const recomendacion = {
      id: randomUUID(), grupoId, autorId: cuenta.id, autorNombre: nombreDe(cuenta), destinatarioId: null,
      tmdbId, tipo, titulo, poster: null, mensaje, creadoEn: ahora(),
    }
    this.recomendaciones.unshift(recomendacion)
    for (const m of this.miembros.filter((x) => x.grupoId === grupoId && x.usuarioId !== cuenta.id)) {
      this.notificar(m.usuarioId, 'recomendacion-compartida', `${nombreDe(cuenta)} te recomendó algo`, `«${titulo}» en ${grupo.nombre}.`, {
        grupoId, grupoNombre: grupo.nombre, recomendacionId: recomendacion.id, tmdbId, tipo, titulo, poster: null, autor: nombreDe(cuenta),
      })
    }
    return recomendacion
  }

  // ── Rutas HTTP ───────────────────────────────────────────────────────────

  /** Devuelve [status, cuerpo] o null si la ruta no es social. */
  atender(metodo, ruta, url, body, perfil) {
    const partes = ruta.split('/').filter(Boolean) // ['api', recurso, ...]
    const [, recurso, id, sub, subId] = partes
    if (recurso === 'perfiles') return this.#perfiles(metodo, id, body)
    if (recurso === 'grupos') return this.#grupos(metodo, id, sub, subId, body, perfil)
    if (recurso === 'invitaciones') return this.#invitaciones(metodo, id, body)
    if (recurso === 'notificaciones') return this.#notificaciones(metodo, id, url, body, perfil)
    return null
  }

  #perfiles(metodo, id, body) {
    const propio = id && this.perfiles.find((p) => p.id === id && p.propietarioId === this.yo.id)
    if (metodo === 'GET' && !id) return [200, this.perfilesDe(this.yo.id)]
    if (metodo === 'POST' && !id) {
      const nombre = String(body?.nombre ?? '').trim()
      const apellido = String(body?.apellido ?? '').trim()
      const edad = Number(body?.edad)
      if (nombre.length < 2 || apellido.length < 2) return [400, { error: 'El nombre debe tener entre 2 y 60 caracteres.' }]
      if (!Number.isInteger(edad) || edad < 5 || edad > 120) return [400, { error: 'La edad debe ser un entero entre 5 y 120.' }]
      if (this.perfilesDe(this.yo.id).length >= 6) return [409, { error: 'Cada cuenta puede tener hasta 6 perfiles.' }]
      const perfil = { id: randomUUID(), propietarioId: this.yo.id, nombre, apellido, edad, avatar: null, esPrincipal: false, creadoEn: ahora() }
      this.perfiles.push(perfil)
      return [201, perfil]
    }
    if (!propio) return [404, { error: 'El perfil no existe.' }]
    if (metodo === 'PATCH') {
      Object.assign(propio, Object.fromEntries(['nombre', 'apellido', 'edad'].filter((k) => body?.[k] !== undefined).map((k) => [k, body[k]])))
      return [200, propio]
    }
    if (metodo === 'DELETE') {
      if (propio.esPrincipal) return [409, { error: 'El perfil principal no se puede eliminar.' }]
      this.perfiles = this.perfiles.filter((p) => p !== propio)
      return [204, null, { perfilEliminado: propio.id }]
    }
    return null
  }

  #miembro(grupoId) {
    return this.miembros.find((m) => m.grupoId === grupoId && m.usuarioId === this.yo.id)
  }

  #detalle(grupo, rol) {
    const miembros = this.miembros.filter((m) => m.grupoId === grupo.id).map((m) => {
      const cuenta = this.cuentas.get(m.usuarioId)
      return { usuarioId: m.usuarioId, nombre: nombreDe(cuenta), email: cuenta?.email ?? null, rol: m.rol, esYo: m.usuarioId === this.yo.id, desde: m.creadoEn }
    })
    return {
      ...grupo,
      rol,
      miembros,
      invitaciones: this.invitaciones.filter((i) => i.grupoId === grupo.id && i.estado === 'pendiente')
        .map((i) => ({ id: i.id, email: i.email, creadoEn: i.creadoEn, puedoCancelar: rol === 'propietario' || i.remitenteId === this.yo.id })),
      recomendaciones: this.recomendaciones
        .filter((r) => r.grupoId === grupo.id && (r.destinatarioId === null || r.destinatarioId === this.yo.id || r.autorId === this.yo.id))
        .map((r) => ({ ...r, esMia: r.autorId === this.yo.id, destinatarioNombre: r.destinatarioId ? nombreDe(this.cuentas.get(r.destinatarioId)) : null })),
    }
  }

  #grupos(metodo, id, sub, subId, body, perfil) {
    if (!id) {
      if (metodo === 'GET') {
        return [200, this.miembros.filter((m) => m.usuarioId === this.yo.id).map((m) => {
          const g = this.grupos.find((x) => x.id === m.grupoId)
          return { id: g.id, nombre: g.nombre, descripcion: g.descripcion, creadoEn: g.creadoEn, rol: m.rol, miembros: this.miembros.filter((x) => x.grupoId === g.id).length }
        })]
      }
      if (metodo === 'POST') {
        const nombre = String(body?.nombre ?? '').trim()
        if (nombre.length < 2) return [400, { error: 'El nombre del grupo debe tener entre 2 y 60 caracteres.' }]
        const grupo = { id: randomUUID(), nombre, descripcion: body?.descripcion ?? null, propietarioId: this.yo.id, creadoEn: ahora() }
        this.grupos.push(grupo)
        this.miembros.push({ grupoId: grupo.id, usuarioId: this.yo.id, rol: 'propietario', creadoEn: ahora() })
        return [201, { ...grupo, rol: 'propietario', miembros: 1 }]
      }
    }
    const grupo = this.grupos.find((g) => g.id === id)
    const yo = grupo && this.#miembro(grupo.id)
    if (!yo) return [404, { error: 'El grupo no existe o no formás parte de él.' }]

    if (!sub && metodo === 'GET') return [200, this.#detalle(grupo, yo.rol)]
    if (!sub && metodo === 'DELETE') {
      if (yo.rol !== 'propietario') return [403, { error: 'Solo quien creó el grupo puede eliminarlo.' }]
      this.grupos = this.grupos.filter((g) => g !== grupo)
      this.miembros = this.miembros.filter((m) => m.grupoId !== grupo.id)
      return [204, null]
    }
    if (sub === 'invitaciones' && metodo === 'POST') {
      const email = String(body?.email ?? '').trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [400, { error: 'Ingresá un correo válido.' }]
      if (email === this.yo.email) return [400, { error: 'No podés invitarte a vos mismo.' }]
      const destino = [...this.cuentas.values()].find((c) => c.email === email)
      if (destino && this.miembros.some((m) => m.grupoId === grupo.id && m.usuarioId === destino.id)) {
        return [409, { error: 'Esa persona ya forma parte del grupo.' }]
      }
      let invitacion = this.invitaciones.find((i) => i.grupoId === grupo.id && i.email === email)
      if (invitacion) Object.assign(invitacion, { estado: 'pendiente', remitenteId: this.yo.id })
      else {
        invitacion = { id: randomUUID(), grupoId: grupo.id, remitenteId: this.yo.id, email, destinatarioId: destino?.id ?? null, estado: 'pendiente', creadoEn: ahora() }
        this.invitaciones.push(invitacion)
      }
      return [201, { id: invitacion.id, email, estado: 'pendiente', creadoEn: invitacion.creadoEn, registrado: Boolean(destino) }]
    }
    if (sub === 'invitaciones' && metodo === 'DELETE') {
      const invitacion = this.invitaciones.find((i) => i.id === subId && i.grupoId === grupo.id && i.estado === 'pendiente')
      if (!invitacion) return [404, { error: 'La invitación no existe o ya fue respondida.' }]
      invitacion.estado = 'cancelada'
      return [204, null]
    }
    if (sub === 'miembros' && metodo === 'DELETE') {
      const saliendo = subId === this.yo.id
      if (saliendo && yo.rol === 'propietario') return [409, { error: 'Quien creó el grupo no puede salir: puede eliminarlo.' }]
      if (!saliendo && yo.rol !== 'propietario') return [403, { error: 'Solo quien creó el grupo puede quitar integrantes.' }]
      const antes = this.miembros.length
      this.miembros = this.miembros.filter((m) => !(m.grupoId === grupo.id && m.usuarioId === subId && m.rol === 'miembro'))
      return antes === this.miembros.length ? [404, { error: 'Esa persona no forma parte del grupo.' }] : [204, null]
    }
    if (sub === 'recomendaciones' && metodo === 'POST') {
      if (body?.destinatarioId && !this.miembros.some((m) => m.grupoId === grupo.id && m.usuarioId === body.destinatarioId)) {
        return [400, { error: 'Esa persona no forma parte del grupo.' }]
      }
      const autorNombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ')
      const recomendacion = {
        id: randomUUID(), grupoId: grupo.id, autorId: this.yo.id, autorPerfilId: perfil.id, autorNombre,
        destinatarioId: body?.destinatarioId ?? null, tmdbId: body.tmdbId, tipo: body.tipo, titulo: body.titulo,
        poster: body.poster ?? null, mensaje: body.mensaje ?? null, creadoEn: ahora(),
      }
      this.recomendaciones.unshift(recomendacion)
      return [201, { ...recomendacion, esMia: true, destinatarioNombre: null }]
    }
    return null
  }

  #invitaciones(metodo, id, body) {
    const mias = this.invitaciones.filter((i) => i.estado === 'pendiente' && (i.destinatarioId === this.yo.id || i.email === this.yo.email))
    if (metodo === 'GET' && !id) {
      return [200, mias.map((i) => ({ id: i.id, grupoId: i.grupoId, grupoNombre: this.grupos.find((g) => g.id === i.grupoId)?.nombre, remitente: nombreDe(this.cuentas.get(i.remitenteId)), creadoEn: i.creadoEn }))]
    }
    if (metodo === 'PUT' && id) {
      if (typeof body?.aceptar !== 'boolean') return [400, { error: 'Indicá si aceptás o rechazás la invitación.' }]
      const invitacion = mias.find((i) => i.id === id)
      if (!invitacion) return [404, { error: 'La invitación no existe o ya fue respondida.' }]
      const estado = body.aceptar ? 'aceptada' : 'rechazada'
      invitacion.estado = estado
      if (body.aceptar) this.miembros.push({ grupoId: invitacion.grupoId, usuarioId: this.yo.id, rol: 'miembro', creadoEn: ahora() })
      for (const n of this.notificaciones.filter((x) => x.usuarioId === this.yo.id && x.datos?.invitacionId === id)) {
        n.leida = true
        n.datos = { ...n.datos, estado }
      }
      return [200, { estado, grupoId: invitacion.grupoId }]
    }
    return null
  }

  #notificaciones(metodo, id, url, body, perfil) {
    const visibles = this.notificacionesPara(perfil.id)
    if (metodo === 'GET' && !id) {
      const limite = Number(url.searchParams.get('limite') ?? 30)
      return [200, { resultados: visibles.slice(0, limite).map(({ usuarioId: _u, ...n }) => n), noLeidas: visibles.filter((n) => !n.leida).length }]
    }
    if (metodo === 'POST' && id === 'leer-todas') {
      const pendientes = visibles.filter((n) => !n.leida)
      for (const n of pendientes) n.leida = true
      return [200, { actualizadas: pendientes.length }]
    }
    if (metodo === 'POST' && id === 'del-dia') {
      const clave = `del-dia:${perfil.id}:${body.fecha}`
      const existente = this.notificaciones.find((n) => n.clave === clave)
      if (existente) return [200, existente]
      const nueva = this.notificar(this.yo.id, 'recomendacion-del-dia', 'Tu recomendación del día', `Hoy te sugerimos ver «${body.titulo}».`,
        { tmdbId: body.tmdbId, tipo: body.tipo, titulo: body.titulo, poster: body.poster ?? null, fecha: body.fecha },
        { perfilId: perfil.id, clave })
      return [201, nueva]
    }
    if (metodo === 'PATCH' && id) {
      const notificacion = visibles.find((n) => n.id === id)
      if (!notificacion) return [404, { error: 'La notificación no existe.' }]
      notificacion.leida = true
      return [200, { leida: true }]
    }
    return null
  }
}
