// Etiquetas en español para las siete expresiones que entrega face-api.js
// (`detection.expressions`). La detección real se integró en `pf17_FaceAPI`.
export const EMOTIONS = {
  neutral: { label: 'Calma', description: 'Tu expresión se ve tranquila.' },
  happy: { label: 'Alegría', description: 'Tu expresión se ve alegre.' },
  sad: { label: 'Tristeza', description: 'Tu expresión se parece a la tristeza.' },
  angry: { label: 'Enojo', description: 'Tu expresión se parece al enojo.' },
  fearful: { label: 'Miedo', description: 'Tu expresión muestra algo de inquietud.' },
  disgusted: { label: 'Desagrado', description: 'Tu expresión se parece al desagrado.' },
  surprised: { label: 'Sorpresa', description: 'Tu expresión muestra asombro.' },
}

// Estados visuales que admite `EmotionStatus`.
export const DETECTION_STATUS = {
  ready: 'ready',
  analyzing: 'analyzing',
  detected: 'detected',
  inconclusive: 'inconclusive',
  error: 'error',
}
