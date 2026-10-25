// Etiquetas en español para las siete expresiones que entrega face-api.js
// (`detection.expressions`). La detección real se integra en `pf10_FaceAPI`.
export const EMOTIONS = {
  neutral: { label: 'Calma', description: 'Tu expresión se ve tranquila.' },
  happy: { label: 'Alegría', description: 'Se nota que hoy estás de buen humor.' },
  sad: { label: 'Tristeza', description: 'Parece que hoy necesitás algo reconfortante.' },
  angry: { label: 'Enojo', description: 'Parece que hoy querés soltar tensión.' },
  fearful: { label: 'Miedo', description: 'Tu expresión muestra algo de inquietud.' },
  disgusted: { label: 'Desagrado', description: 'Algo no terminó de convencerte hoy.' },
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
