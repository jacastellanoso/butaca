// Datos exclusivamente visuales para pf10. No representan registros de TMDB.
const categorias = ['Acción', 'Comedia', 'Drama', 'Terror', 'Romance', 'Ciencia ficción', 'Animación']

export const contenidosDemo = Array.from({ length: 21 }, (_, index) => ({
  id: `demo-${index + 1}`,
  titulo: `Contenido de demostración ${String(index + 1).padStart(2, '0')}`,
  tipo: index % 3 === 0 ? 'Serie' : 'Película',
  anio: null,
  generos: [categorias[index % categorias.length]],
  calificacion: null,
  sinopsis: 'Ficha temporal de interfaz. La información real llegará desde el servicio de catálogo.',
  portada: null,
  esDemostracion: true,
}))

export const categoriasGaleria = ['Todos', ...categorias]
