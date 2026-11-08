// Lógica pura de «Cargar más» en la galería (sin React ni red, para probarla).

// Categorías oficiales del catálogo (catalog-service: CATEGORIAS_GALERIA).
export const CATEGORIAS = ['Todos', 'Acción', 'Animación', 'Ciencia ficción', 'Comedia', 'Drama', 'Romance', 'Terror']

/**
 * Agrega una página nueva a la lista sin repetir títulos. TMDB puede devolver
 * el mismo título en dos páginas (la popularidad cambia entre consultas).
 * Si se indica categoría, también se descartan los que no la tengan.
 */
export function combinarPagina(actuales, nuevos, categoria = 'Todos') {
  const vistos = new Set(actuales.map((c) => c.id))
  const agregados = []
  for (const contenido of nuevos) {
    if (!contenido?.id || vistos.has(contenido.id)) continue
    if (categoria !== 'Todos' && !(contenido.generos ?? []).includes(categoria)) continue
    vistos.add(contenido.id)
    agregados.push(contenido)
  }
  return [...actuales, ...agregados]
}

/** ¿Quedan páginas por pedir? */
export function hayMasPaginas({ pagina, totalPaginas }) {
  return Number.isInteger(pagina) && Number.isInteger(totalPaginas) && pagina < totalPaginas
}

// ── Catálogo dormido en Render ───────────────────────────────────────────
// Con el catálogo dormido, el gateway recibe de Render un 502 inmediato
// mientras el servicio arranca (~15-60 s). Se reintenta con espera creciente
// unos 70 s; después se muestra el error con «Reintentar». Un 500 o un 400
// (configuración o consulta inválida) no se reintenta: se muestra enseguida.
export const ESPERAS_CATALOGO_MS = [1500, 3000, 5000, 8000, 10000, 12000, 15000, 15000]

export function esFalloTransitorio(error) {
  if (!error) return false
  if (error.codigo === 'sin-conexion') return true
  return [408, 425, 429, 502, 503, 504].includes(error.status)
}

/**
 * Pide una página reintentando solo los fallos transitorios.
 * alEsperar(intento) avisa que el servicio está despertando.
 */
export async function pedirConReintentos(pedir, { esperar, alEsperar = () => {}, esperas = ESPERAS_CATALOGO_MS, cancelado = () => false }) {
  let ultimo
  for (let intento = 0; intento <= esperas.length; intento++) {
    if (intento > 0) {
      alEsperar(intento)
      await esperar(esperas[intento - 1])
      if (cancelado()) throw Object.assign(new Error('cancelado'), { codigo: 'cancelado' })
    }
    try {
      return await pedir()
    } catch (error) {
      ultimo = error
      if (!esFalloTransitorio(error)) throw error
    }
  }
  throw ultimo
}

/** Clave de una combinación de filtros: cada una tiene su propia lista paginada. */
export function claveFiltros({ categoria = 'Todos', emocion = null, busqueda = '' }) {
  return JSON.stringify([categoria, emocion ?? '', busqueda.trim().toLowerCase()])
}
