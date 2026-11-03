// Perfiles de visualización ("¿Quién va a ver hoy?").
//
// PostgreSQL todavía NO tiene un modelo Perfil: Usuario es la única identidad
// (backend/prisma/schema.prisma). Por eso el único perfil real es el de la
// cuenta autenticada, armado con los datos que entrega Supabase Auth.
// La elección se recuerda en sessionStorage solo como estado de interfaz: no
// separa datos en el backend ni reemplaza al token.

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
export function perfilDeCuenta(usuario) {
  if (!usuario?.id) return null
  const meta = usuario.user_metadata ?? {}
  const email = texto(usuario.email)
  const nombre =
    texto(meta.full_name) ?? texto(meta.name) ?? texto(meta.user_name) ??
    texto(meta.preferred_username) ?? (email ? email.split('@')[0] : 'Mi perfil')

  return {
    id: usuario.id,
    nombre,
    email,
    avatar: urlSegura(meta.avatar_url) ?? urlSegura(meta.picture),
    proveedor: texto(usuario.app_metadata?.provider),
    inicial: nombre.charAt(0).toUpperCase(),
  }
}

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
