import { supabase } from './supabase.js'

// Dirección del API Gateway.
// - En desarrollo se deja VITE_API_GATEWAY_URL vacía: las rutas /api/* van al
//   mismo origen (localhost:5173) y el proxy de vite.config.js las reenvía al
//   gateway en localhost:3000. Así el navegador no aplica CORS.
// - En producción se define con la URL pública del gateway (HTTPS).
const API_GATEWAY_URL = (import.meta.env.VITE_API_GATEWAY_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(codigo, mensaje, status) {
    super(mensaje)
    this.name = 'ApiError'
    this.codigo = codigo
    this.status = status
  }
}

const MENSAJES_POR_STATUS = {
  401: ['sesion-expirada', 'Tu sesión expiró. Volvé a iniciar sesión para guardar.'],
  403: ['sin-consentimiento', 'Necesitamos tu autorización para guardar este resultado.'],
  409: ['usuario-sin-registro', 'Tu cuenta todavía no está lista. Intentá de nuevo en unos segundos.'],
  502: ['servicio-no-disponible', 'El servicio no está disponible en este momento. Intentá más tarde.'],
}

async function obtenerToken() {
  if (!supabase) {
    throw new ApiError('sin-configuracion', 'Falta configurar la conexión con Supabase.')
  }

  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token

  if (!token) {
    throw new ApiError('sin-sesion', 'Iniciá sesión con Google o GitHub para guardar tu historial.')
  }
  return token
}

/** fetch al gateway con el token de Supabase y errores traducidos a ApiError. */
export async function solicitarApi(ruta, { method = 'GET', body } = {}) {
  const token = await obtenerToken()

  let respuesta
  try {
    respuesta = await fetch(`${API_GATEWAY_URL}${ruta}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('sin-conexion', 'No pudimos conectar con Butaca. Revisá tu conexión.')
  }

  if (!respuesta.ok) {
    const [codigo, mensaje] = MENSAJES_POR_STATUS[respuesta.status] ?? [
      'error-servidor',
      'No pudimos completar la operación. Intentá de nuevo.',
    ]
    throw new ApiError(codigo, mensaje, respuesta.status)
  }

  return respuesta.status === 204 ? null : respuesta.json()
}