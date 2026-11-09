// Validación de entradas de perfiles, grupos y notificaciones.
// Devuelve { datos } o { error } con un mensaje apto para mostrar.

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIPOS = ['movie', 'tv']

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '')

function validarNombre(valor, campo) {
  const limpio = texto(valor)
  if (limpio.length < 2 || limpio.length > 60) return { error: `${campo} debe tener entre 2 y 60 caracteres.` }
  return { valor: limpio }
}

function validarEdad(valor) {
  const edad = typeof valor === 'string' && /^\d+$/.test(valor.trim()) ? Number(valor) : valor
  if (!Number.isInteger(edad) || edad < 5 || edad > 120) return { error: 'La edad debe ser un entero entre 5 y 120.' }
  return { valor: edad }
}

/** Perfil completo (crear) o parcial (editar). */
export function validarPerfil(body, { parcial = false } = {}) {
  const entrada = body && typeof body === 'object' ? body : {}
  const datos = {}
  const campos = [
    ['nombre', (v) => validarNombre(v, 'El nombre')],
    ['apellido', (v) => validarNombre(v, 'El apellido')],
    ['edad', validarEdad],
  ]
  for (const [campo, validar] of campos) {
    if (parcial && entrada[campo] === undefined) continue
    const { valor, error } = validar(entrada[campo])
    if (error) return { error }
    datos[campo] = valor
  }
  if (parcial && Object.keys(datos).length === 0) return { error: 'No hay cambios para guardar.' }
  return { datos }
}

export function validarGrupo(body) {
  const nombre = texto(body?.nombre)
  if (nombre.length < 2 || nombre.length > 60) return { error: 'El nombre del grupo debe tener entre 2 y 60 caracteres.' }
  const descripcion = texto(body?.descripcion)
  if (descripcion.length > 200) return { error: 'La descripción no puede superar 200 caracteres.' }
  return { datos: { nombre, descripcion: descripcion || null } }
}

export function validarEmail(body) {
  const email = texto(body?.email).toLowerCase()
  if (!EMAIL.test(email) || email.length > 254) return { error: 'Ingresá un correo válido.' }
  return { datos: { email } }
}

export function validarRecomendacion(body) {
  const entrada = body && typeof body === 'object' ? body : {}
  const tmdbId = Number(entrada.tmdbId)
  if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) return { error: 'El contenido a compartir no es válido.' }
  if (!TIPOS.includes(entrada.tipo)) return { error: 'El tipo debe ser "movie" o "tv".' }
  const titulo = texto(entrada.titulo)
  if (!titulo || titulo.length > 200) return { error: 'El título del contenido no es válido.' }
  let poster = null
  if (entrada.poster != null) {
    try {
      poster = new URL(entrada.poster).protocol === 'https:' ? entrada.poster : null
    } catch {
      poster = null
    }
  }
  const mensaje = texto(entrada.mensaje)
  if (mensaje.length > 280) return { error: 'El mensaje no puede superar 280 caracteres.' }
  const destinatarioId = entrada.destinatarioId == null || entrada.destinatarioId === ''
    ? null
    : texto(entrada.destinatarioId)
  if (destinatarioId !== null && (destinatarioId.length < 1 || destinatarioId.length > 64)) {
    return { error: 'El destinatario no es válido.' }
  }
  return { datos: { tmdbId, tipo: entrada.tipo, titulo, poster, mensaje: mensaje || null, destinatarioId } }
}

/** Recomendación del día: contenido + fecha local YYYY-MM-DD (±1 día del servidor). */
export function validarDelDia(body, ahora = new Date()) {
  const { datos, error } = validarRecomendacion({ ...body, mensaje: undefined, destinatarioId: undefined })
  if (error) return { error }
  const fecha = texto(body?.fecha)
  const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  const instante = coincide ? Date.UTC(Number(coincide[1]), Number(coincide[2]) - 1, Number(coincide[3])) : NaN
  if (Number.isNaN(instante) || Math.abs(instante - ahora.getTime()) > 2 * 24 * 60 * 60 * 1000) {
    return { error: 'La fecha de la recomendación del día no es válida.' }
  }
  return { datos: { ...datos, fecha } }
}
