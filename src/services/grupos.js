import { solicitarApi } from '../lib/api.js'

// Grupos para compartir recomendaciones (auth-service, /api/grupos).
// La membresía es de la cuenta; quien comparte se identifica con el perfil activo.

const opciones = (method, body) => ({ method, body, mensajesServidor: true })
const id = (valor) => encodeURIComponent(valor)

export const listarGrupos = () => solicitarApi('/api/grupos')
export const crearGrupo = ({ nombre, descripcion }) =>
  solicitarApi('/api/grupos', opciones('POST', { nombre, descripcion }))
export const obtenerGrupo = (grupoId) => solicitarApi(`/api/grupos/${id(grupoId)}`, { mensajesServidor: true })
export const eliminarGrupo = (grupoId) => solicitarApi(`/api/grupos/${id(grupoId)}`, opciones('DELETE'))

export const invitarAGrupo = (grupoId, email) =>
  solicitarApi(`/api/grupos/${id(grupoId)}/invitaciones`, opciones('POST', { email }))
export const cancelarInvitacion = (grupoId, invitacionId) =>
  solicitarApi(`/api/grupos/${id(grupoId)}/invitaciones/${id(invitacionId)}`, opciones('DELETE'))
export const quitarMiembro = (grupoId, usuarioId) =>
  solicitarApi(`/api/grupos/${id(grupoId)}/miembros/${id(usuarioId)}`, opciones('DELETE'))

/** Comparte un contenido ({ tmdbId, tipoTmdb, titulo, poster }) con el grupo o con un integrante. */
export function compartirRecomendacion(grupoId, contenido, { mensaje, destinatarioId } = {}) {
  return solicitarApi(`/api/grupos/${id(grupoId)}/recomendaciones`, opciones('POST', {
    tmdbId: contenido.tmdbId,
    tipo: contenido.tipoTmdb ?? contenido.tipo,
    titulo: contenido.titulo,
    poster: contenido.poster ?? contenido.portada ?? null,
    mensaje: mensaje || undefined,
    destinatarioId: destinatarioId || undefined,
  }))
}

export const listarInvitaciones = () => solicitarApi('/api/invitaciones')
export const responderInvitacion = (invitacionId, aceptar) =>
  solicitarApi(`/api/invitaciones/${id(invitacionId)}`, opciones('PUT', { aceptar }))
