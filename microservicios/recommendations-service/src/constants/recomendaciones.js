// Preferencias editoriales; no representan efectos terapéuticos.
export const categoriasPorEmocion = Object.freeze({
  happy: ['Comedia', 'Acción'],
  sad: ['Comedia', 'Animación'],
  angry: ['Acción', 'Comedia'],
  fearful: ['Comedia', 'Animación'],
  disgusted: ['Acción', 'Ciencia ficción'],
  surprised: ['Ciencia ficción', 'Terror'],
  neutral: ['Drama', 'Acción'],
})

export const esEmocionValida = (value) => Object.hasOwn(categoriasPorEmocion, value)
