// Las siete expresiones que entrega face-api.js (mismas claves que
// src/pages/Rostro/emotions.js en el front).
export const EMOCIONES = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
]

export const TIPOS_CONTENIDO = ['movie', 'tv']

export const esEmocionValida = (valor) => EMOCIONES.includes(valor)
export const esTipoValido = (valor) => TIPOS_CONTENIDO.includes(valor)