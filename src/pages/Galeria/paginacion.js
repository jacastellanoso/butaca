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
