import { solicitarApi } from '../lib/api.js'

// Centro de notificaciones (auth-service, /api/notificaciones). Cada
// notificación es de la cuenta o, como la recomendación del día, de un perfil.

export const TIPOS_NOTIFICACION = {
  'invitacion-grupo': 'Invitación',
  'invitacion-aceptada': 'Invitación aceptada',
  'invitacion-rechazada': 'Invitación rechazada',
  'recomendacion-compartida': 'Recomendación compartida',
  'recomendacion-del-dia': 'Recomendación del día',
  'miembro-removido': 'Grupos',
  'miembro-salio': 'Grupos',
  'grupo-eliminado': 'Grupos',
}

export async function listarNotificaciones(limite = 30) {
  const respuesta = await solicitarApi(`/api/notificaciones?limite=${limite}`)
  if (!respuesta || !Array.isArray(respuesta.resultados) || !Number.isInteger(respuesta.noLeidas)) {
    throw new Error('El servicio devolvió las notificaciones con un formato inesperado.')
  }
  return respuesta
}

export const marcarLeida = (id) =>
  solicitarApi(`/api/notificaciones/${encodeURIComponent(id)}`, { method: 'PATCH', body: { leida: true } })
export const marcarTodasLeidas = () => solicitarApi('/api/notificaciones/leer-todas', { method: 'POST' })

/** Fecha local YYYY-MM-DD (la recomendación del día cambia a medianoche local). */
export function fechaLocal(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

/**
 * Elige de forma estable un contenido para el día: el mismo perfil ve el mismo
 * título durante todo el día, y otro perfil o el día siguiente pueden variar.
 */
export function elegirDelDia(resultados, fecha, semilla = '') {
  if (!Array.isArray(resultados) || resultados.length === 0) return null
  let hash = 0
  for (const caracter of `${fecha}:${semilla}`) hash = (hash * 31 + caracter.charCodeAt(0)) >>> 0
  // Solo entre las primeras posiciones: son las mejor ubicadas para la emoción.
  const candidatos = resultados.slice(0, Math.min(resultados.length, 10))
  return candidatos[hash % candidatos.length]
}

export const registrarDelDia = (contenido, fecha) =>
  solicitarApi('/api/notificaciones/del-dia', {
    method: 'POST',
    body: {
      tmdbId: contenido.tmdbId,
      tipo: contenido.tipoTmdb,
      titulo: contenido.titulo,
      poster: contenido.poster ?? null,
      fecha,
    },
  })
