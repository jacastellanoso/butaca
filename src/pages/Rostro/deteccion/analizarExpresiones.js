// Lógica pura del análisis: no importa face-api.js ni toca el navegador,
// por eso se puede probar con node:test (ver analizarExpresiones.test.js).

// Las siete expresiones que entrega face-api.js (mismas claves que emotions.js
// y que emotions-service).
export const EXPRESIONES = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
]

export const CONFIG_ANALISIS = {
  // Ventana de observación: "que me mire a la cara un segundo" con margen.
  duracionMs: 3000,
  // En equipos lentos (cada fotograma tarda ~1 s sin GPU) se sigue observando
  // hasta juntar el mínimo de muestras, pero nunca más de este tiempo.
  duracionMaximaMs: 8000,
  // Pausa entre fotogramas analizados (~5 por segundo): suficiente para
  // promediar sin saturar la CPU en computadoras modestas o celulares.
  intervaloMs: 200,
  // Mínimo de fotogramas con rostro para confiar en el promedio.
  minimoMuestras: 5,
  // Por debajo de esta probabilidad promedio el resultado es ambiguo.
  umbralConfianza: 0.5,
}

/**
 * Decide si la ventana de observación terminó: a los duracionMs si ya hay
 * suficientes muestras, o al llegar a duracionMaximaMs en cualquier caso.
 */
export function debeTerminar(transcurridoMs, cantidadMuestras, config = CONFIG_ANALISIS) {
  if (transcurridoMs >= config.duracionMaximaMs) return true
  return transcurridoMs >= config.duracionMs && cantidadMuestras >= config.minimoMuestras
}

/**
 * Copia solo las siete probabilidades conocidas de un resultado de face-api.js.
 * Devuelve null si la muestra no trae números válidos.
 */
export function normalizarMuestra(expresiones) {
  if (!expresiones || typeof expresiones !== 'object') return null

  const muestra = {}
  for (const clave of EXPRESIONES) {
    const valor = expresiones[clave]
    if (typeof valor !== 'number' || !Number.isFinite(valor)) return null
    muestra[clave] = Math.min(Math.max(valor, 0), 1)
  }
  return muestra
}

/**
 * Promedia las probabilidades de todas las muestras y elige la expresión
 * dominante. Promediar evita que un parpadeo o un gesto de un solo
 * fotograma decida el resultado.
 */
export function promediarMuestras(muestras) {
  if (!Array.isArray(muestras) || muestras.length === 0) return null

  const sumas = Object.fromEntries(EXPRESIONES.map((clave) => [clave, 0]))
  for (const muestra of muestras) {
    for (const clave of EXPRESIONES) sumas[clave] += muestra[clave]
  }

  let emocion = EXPRESIONES[0]
  for (const clave of EXPRESIONES) {
    if (sumas[clave] > sumas[emocion]) emocion = clave
  }

  return { emocion, confianza: sumas[emocion] / muestras.length }
}

/**
 * Traduce las muestras recolectadas al contrato `detection` de Rostro:
 * { status, emotion, confidence, message }.
 */
export function decidirResultado(muestras, config = CONFIG_ANALISIS) {
  if (!Array.isArray(muestras) || muestras.length < config.minimoMuestras) {
    return {
      status: 'inconclusive',
      message: 'No logramos ver tu rostro con claridad. Centrate en el recuadro, mejorá la luz y volvé a intentarlo.',
    }
  }

  const { emocion, confianza } = promediarMuestras(muestras)

  if (confianza < config.umbralConfianza) {
    return {
      status: 'inconclusive',
      message: 'Tu expresión no fue lo bastante clara. Volvé a intentarlo mirando de frente.',
    }
  }

  return { status: 'detected', emotion: emocion, confidence: confianza }
}