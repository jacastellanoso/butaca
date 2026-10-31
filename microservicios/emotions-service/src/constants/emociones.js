// Las siete expresiones que entrega face-api.js (mismas claves que
// src/pages/Rostro/emotions.js en el front y backend/src/constants/emociones.js).
export const EMOCIONES = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
]

// 'deteccion': resultado de face-api.js (exige confianza).
// 'confirmada': emoción elegida o corregida por el usuario (confianza opcional).
export const ORIGENES = ['deteccion', 'confirmada']

// Versión del texto de consentimiento para conservar el historial. Se guarda
// en cada registro como evidencia; cambiarla junto con el texto del front.
export const CONSENTIMIENTO_HISTORIAL_VERSION = 'historial-v1'

export const PAGINACION = { limitePorDefecto: 20, limiteMaximo: 100 }
