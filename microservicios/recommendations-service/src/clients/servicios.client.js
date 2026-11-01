export class DependencyError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

// El plazo cubre también el body; nunca seguir redirecciones con el Bearer.
export function crearCliente({ fetchImpl, config, signal }) {
  return async function consultar(baseUrl, path, authorization, protectedResource = false) {
    try {
      const response = await fetchImpl(new URL(path, baseUrl), {
        headers: authorization ? { Accept: 'application/json', Authorization: authorization } : { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(config.upstreamTimeoutMs)]),
      })
      if (response.status === 401 && protectedResource) throw new DependencyError(401, 'Sesión inválida o expirada.')
      if (response.status === 404 && protectedResource) throw new DependencyError(404, 'El registro emocional no existe.')
      if ([429, 500, 502, 503, 504].includes(response.status)) throw new DependencyError(503, 'Un servicio necesario no está disponible.')
      if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/json')) {
        throw new DependencyError(502, 'Respuesta inválida de un servicio necesario.')
      }
      return await response.json()
    } catch (error) {
      if (error instanceof DependencyError) throw error
      if (error instanceof SyntaxError) throw new DependencyError(502, 'Respuesta JSON inválida de un servicio necesario.')
      throw new DependencyError(503, 'Un servicio necesario no está disponible o excedió el tiempo límite.')
    }
  }
}
