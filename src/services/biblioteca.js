import { solicitarApi } from '../lib/api.js'
import {
  adaptarFavorito,
  adaptarHistorial,
  adaptarListadoFavoritos,
  adaptarListadoHistorial,
  construirQueryHistorial,
} from './contratos.js'
import { sincronizarUsuario } from './usuarios.js'

// library-service: favoritos e historial de recomendaciones.
// Cada usuario solo ve y modifica sus propios registros (req.user.id en el servidor).

/** Todos los favoritos del usuario (páginas de 100, hasta 1000). */
export async function listarFavoritos() {
  const favoritos = []
  for (let pagina = 1; pagina <= 10; pagina += 1) {
    const { resultados, paginacion } = adaptarListadoFavoritos(
      await solicitarApi(`/api/favoritos?pagina=${pagina}&limite=100`),
    )
    favoritos.push(...resultados)
    if (pagina >= paginacion.totalPaginas) break
  }
  return favoritos
}

/** POST idempotente: 201 si se creó, 200 si ya existía. */
export async function agregarFavorito({ tmdbId, tipoTmdb, titulo, poster }) {
  await sincronizarUsuario()
  const favorito = await solicitarApi('/api/favoritos', {
    method: 'POST',
    body: { tmdbId, tipo: tipoTmdb, titulo, poster: poster || null },
  })
  return adaptarFavorito(favorito)
}

export async function eliminarFavorito(id) {
  await solicitarApi(`/api/favoritos/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Una página del historial de recomendaciones: { resultados, paginacion }. */
export async function listarHistorialRecomendaciones(filtros = {}) {
  const query = construirQueryHistorial({ limite: 20, ...filtros })
  return adaptarListadoHistorial(await solicitarApi(`/api/historial?${query}`))
}

// Cuántas recomendaciones se conservan por cada ánimo guardado.
// Igual a lo que se muestra tras cada escaneo (RecomendacionesRostro: máximo tres).
export const DESTACADAS_POR_ANIMO = 3
const CLAVE_REGISTRADAS = 'butaca:historial-registrado'

function animosYaRegistrados() {
  try {
    return new Set(JSON.parse(globalThis.sessionStorage?.getItem(CLAVE_REGISTRADAS) ?? '[]'))
  } catch {
    return new Set()
  }
}

/**
 * Guarda en /api/historial las recomendaciones destacadas que se le mostraron
 * al usuario para un ánimo que él autorizó guardar. Registra qué se recomendó,
 * no que lo haya visto. Se hace una sola vez por animoId en esta pestaña.
 */
export async function registrarRecomendacionesDestacadas({ animoId, emocion, resultados }) {
  const registrados = animosYaRegistrados()
  if (!animoId || registrados.has(animoId)) return []

  await sincronizarUsuario()
  const guardados = []
  for (const item of resultados.slice(0, DESTACADAS_POR_ANIMO)) {
    const registro = await solicitarApi('/api/historial', {
      method: 'POST',
      body: {
        emocion,
        tmdbId: item.tmdbId,
        tipo: item.tipoTmdb,
        titulo: item.titulo,
        poster: item.poster ?? null,
        calificacion: item.calificacion ?? null,
      },
    })
    guardados.push(adaptarHistorial(registro))
  }

  registrados.add(animoId)
  try {
    globalThis.sessionStorage?.setItem(CLAVE_REGISTRADAS, JSON.stringify([...registrados]))
  } catch {
    // Sin almacenamiento solo se pierde la protección contra duplicados al recargar.
  }
  return guardados
}
