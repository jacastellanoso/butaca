// Carga diferida de face-api.js, del motor de TensorFlow.js y de los modelos.
//
// - El import dinámico deja la librería (TensorFlow.js incluido) en un archivo
//   aparte que solo se descarga al abrir Rostro, no en la pantalla de inicio.
// - Los modelos (/models) y el motor WebAssembly (/wasm) se sirven desde la
//   propia app: no se usa un CDN y la imagen de la cámara nunca sale del navegador.
// - La promesa se guarda para cargar una sola vez aunque se analice varias veces.

const BASE = import.meta.env.BASE_URL
const RUTA_MODELOS = `${BASE}models`
const RUTA_WASM = `${BASE}wasm/`

// Del más rápido al más lento. WebGL usa la GPU; si el navegador la bloquea
// (por ejemplo Brave con protección anti-fingerprinting o la aceleración por
// hardware apagada), WebAssembly sigue siendo varias veces más rápido que CPU.
const MOTORES = ['webgl', 'wasm', 'cpu']

let cargando = null
let motorActivo = null

/** Motor de TensorFlow.js en uso ('webgl', 'wasm' o 'cpu'), o null si aún no cargó. */
export const obtenerMotor = () => motorActivo

async function elegirMotor(tf) {
  for (const motor of MOTORES) {
    try {
      if (await tf.setBackend(motor)) {
        await tf.ready()
        return motor
      }
    } catch {
      // Ese motor no está disponible en este navegador: se prueba el siguiente.
    }
  }
  throw new Error('Ningún motor de TensorFlow.js está disponible en este navegador.')
}

export function cargarFaceApi() {
  cargando ??= (async () => {
    const faceapi = await import('@vladmandic/face-api')

    // Los .wasm (copiados de @tensorflow/tfjs-backend-wasm 4.22.0, la misma
    // versión que trae face-api) se sirven desde /public/wasm. Sin esta ruta,
    // el motor los busca junto al bundle y Vite responde con index.html.
    faceapi.tf.setWasmPaths(RUTA_WASM)
    motorActivo = await elegirMotor(faceapi.tf)
    console.info(`[face-api] Motor de TensorFlow.js: ${motorActivo}`)

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(RUTA_MODELOS),
      faceapi.nets.faceExpressionNet.loadFromUri(RUTA_MODELOS),
    ])

    return faceapi
  })().catch((error) => {
    // Si falló (sin red, por ejemplo) se permite reintentar en el próximo análisis.
    cargando = null
    motorActivo = null
    throw error
  })

  return cargando
}