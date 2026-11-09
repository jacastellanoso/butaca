// Perfiles de visualización ("¿Quién va a ver hoy?").
//
// Cada cuenta tiene un perfil principal (creado por auth-service al registrar
// el usuario) y puede crear perfiles adicionales con nombre, apellido y edad
// (tabla Perfil, /api/perfiles). Ánimos, favoritos, historial y la
// recomendación del día se guardan por perfil: el perfil elegido viaja en el
// encabezado X-Butaca-Perfil y el servidor verifica que sea de la cuenta.
// La elección se recuerda en sessionStorage para mantenerla al navegar y al
// recargar la pestaña, solo si coincide con la cuenta autenticada.

import { solicitarApi } from '../lib/api.js'

const CLAVE_PERFIL_ACTIVO = 'butaca:perfil-activo'

function texto(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

function urlSegura(valor) {
  const url = texto(valor)
  if (!url) return null
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

/** Perfil principal de la cuenta a partir del usuario de Supabase Auth. */
export function perfilDeCuenta(usuario, registro) {
  if (!usuario?.id) return null
  const meta = usuario.user_metadata ?? {}
  const email = texto(usuario.email)
  const nombreOAuth =
    texto(meta.full_name) ?? texto(meta.name) ?? texto(meta.user_name) ??
    texto(meta.preferred_username) ?? (email ? email.split('@')[0] : 'Mi perfil')
  const nombreGuardado = [texto(registro?.nombre), texto(registro?.apellido)].filter(Boolean).join(' ')
  const nombre = nombreGuardado || nombreOAuth

  return {
    id: usuario.id,
    nombre,
    email,
    avatar: urlSegura(meta.avatar_url) ?? urlSegura(meta.picture),
    proveedor: texto(usuario.app_metadata?.provider),
    inicial: nombre.charAt(0).toUpperCase(),
  }
}

/**
 * Perfil de /api/perfiles listo para la interfaz. El principal hereda el
 * avatar, el correo y el proveedor de la cuenta; los demás muestran su inicial.
 */
export function adaptarPerfil(remoto, cuenta) {
  const nombre = texto(remoto?.nombre) ?? 'Perfil'
  const apellido = texto(remoto?.apellido)
  const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ')
  return {
    id: remoto.id,
    nombre: nombreCompleto,
    nombrePila: nombre,
    apellido,
    edad: Number.isInteger(remoto?.edad) ? remoto.edad : null,
    esPrincipal: remoto?.esPrincipal === true,
    avatar: remoto?.esPrincipal ? cuenta?.avatar ?? null : urlSegura(remoto?.avatar),
    email: remoto?.esPrincipal ? cuenta?.email ?? null : null,
    proveedor: remoto?.esPrincipal ? cuenta?.proveedor ?? null : null,
    inicial: nombre.charAt(0).toUpperCase(),
    remoto: true,
  }
}

/** Elige el perfil activo: el guardado si sigue existiendo; si no, el principal. */
export function elegirPerfilActivo(perfiles, guardadoId) {
  if (!Array.isArray(perfiles) || perfiles.length === 0) return null
  return perfiles.find((p) => p.id === guardadoId) ?? perfiles.find((p) => p.esPrincipal) ?? perfiles[0]
}

// ── API (auth-service) ──────────────────────────────────────────────────

export async function listarPerfiles(cuenta) {
  const lista = await solicitarApi('/api/perfiles')
  if (!Array.isArray(lista)) throw new Error('El servicio devolvió los perfiles con un formato inesperado.')
  return lista.map((perfil) => adaptarPerfil(perfil, cuenta))
}

export async function crearPerfil({ nombre, apellido, edad }, cuenta) {
  const creado = await solicitarApi('/api/perfiles', {
    method: 'POST', body: { nombre, apellido, edad }, mensajesServidor: true,
  })
  return adaptarPerfil(creado, cuenta)
}

export async function actualizarPerfil(id, cambios, cuenta) {
  const actualizado = await solicitarApi(`/api/perfiles/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: cambios, mensajesServidor: true,
  })
  return adaptarPerfil(actualizado, cuenta)
}

export async function eliminarPerfil(id) {
  await solicitarApi(`/api/perfiles/${encodeURIComponent(id)}`, { method: 'DELETE', mensajesServidor: true })
}

// ── Perfil elegido en esta pestaña ──────────────────────────────────────

function almacenamiento(storage) {
  if (storage) return storage
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

/** Id del perfil activo, solo si pertenece a la cuenta autenticada. */
export function obtenerPerfilActivo(usuarioId, storage) {
  const store = almacenamiento(storage)
  if (!store || !usuarioId) return null
  try {
    const guardado = JSON.parse(store.getItem(CLAVE_PERFIL_ACTIVO) ?? 'null')
    return guardado?.usuarioId === usuarioId && typeof guardado.perfilId === 'string'
      ? guardado.perfilId
      : null
  } catch {
    return null
  }
}

export function guardarPerfilActivo(usuarioId, perfilId, storage) {
  const store = almacenamiento(storage)
  if (!store) return
  try {
    store.setItem(CLAVE_PERFIL_ACTIVO, JSON.stringify({ usuarioId, perfilId }))
  } catch {
    // Navegación privada o almacenamiento bloqueado: se vuelve a preguntar.
  }
}

export function limpiarPerfilActivo(storage) {
  const store = almacenamiento(storage)
  try {
    store?.removeItem(CLAVE_PERFIL_ACTIVO)
  } catch {
    // Sin almacenamiento disponible no hay nada que limpiar.
  }
}
