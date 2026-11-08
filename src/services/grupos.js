import { solicitarApi } from '../lib/api.js'

export const listarPerfiles = () => solicitarApi('/api/perfiles')
export const crearPerfil = (nombre) => solicitarApi('/api/perfiles', { method: 'POST', body: { nombre } })
export const listarInvitaciones = () => solicitarApi('/api/invitaciones')
export const enviarInvitacion = (email) => solicitarApi('/api/invitaciones', { method: 'POST', body: { email } })
export const responderInvitacion = (id, aceptar) => solicitarApi(`/api/invitaciones/${encodeURIComponent(id)}`, { method: 'PUT', body: { aceptar } })
