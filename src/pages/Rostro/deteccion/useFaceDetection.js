import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CONFIG_ANALISIS,
  debeTerminar,
  decidirResultado,
  normalizarMuestra,
} from './analizarExpresiones.js'
import { cargarFaceApi } from './cargarFaceApi.js'

const ESTADO_INICIAL = { status: 'ready' }

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// La primera inferencia de WebGL compila los shaders y puede tardar varios
// segundos. Se hace una sola vez, fuera de la ventana de observación.
let modeloCalentado = false

/**
 * Conecta face-api.js con el contrato de Rostro (`onVideoReady` y `detection`).
 *
 * Cada análisis observa el video unos segundos (ver debeTerminar), guarda
 * solo las siete probabilidades de cada fotograma con rostro y al final
 * promedia. Los fotogramas no se copian, no se dibujan en canvas propios y no
 * se envían a ningún servidor.
 */
export function useFaceDetection(config = CONFIG_ANALISIS) {
  const [detection, setDetection] = useState(ESTADO_INICIAL)
  const videoRef = useRef(null)
  // Cada análisis recibe un número. Si cambia (cámara apagada, nuevo análisis
  // o pantalla cerrada), el análisis anterior se detiene sin tocar el estado.
  const analisisActualRef = useRef(0)

  const analizar = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    const analisis = ++analisisActualRef.current
    const sigueVigente = () => analisis === analisisActualRef.current

    setDetection({ status: 'analyzing', message: 'Preparando el análisis…' })

    try {
      const faceapi = await cargarFaceApi()
      if (!sigueVigente()) return

      const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })

      if (!modeloCalentado) {
        await faceapi.detectSingleFace(video, opciones).withFaceExpressions()
        modeloCalentado = true
        if (!sigueVigente()) return
      }

      setDetection({ status: 'analyzing' })

      const muestras = []
      const inicio = performance.now()

      while (!debeTerminar(performance.now() - inicio, muestras.length, config)) {
        // Si la pestaña está oculta el video no avanza: se espera sin analizar.
        if (video.readyState >= 2 && !document.hidden) {
          const resultado = await faceapi.detectSingleFace(video, opciones).withFaceExpressions()
          if (!sigueVigente()) return

          const muestra = normalizarMuestra(resultado?.expressions)
          if (muestra) muestras.push(muestra)
        }

        await esperar(config.intervaloMs)
        if (!sigueVigente()) return
      }

      setDetection(decidirResultado(muestras, config))
    } catch (error) {
      if (!sigueVigente()) return
      console.error('No fue posible analizar la expresión.', error)
      setDetection({
        status: 'error',
        message: 'No pudimos cargar el analizador de expresiones. Revisá tu conexión e intentá de nuevo.',
      })
    }
  }, [config])

  // Rostro avisa con el <video> cuando hay imagen y con null al apagar la cámara.
  const onVideoReady = useCallback(
    (video) => {
      videoRef.current = video
      analisisActualRef.current += 1

      if (video) {
        analizar()
      } else {
        setDetection(ESTADO_INICIAL)
      }
    },
    [analizar],
  )

  // Al salir de la pantalla se cancela cualquier análisis en curso.
  useEffect(
    () => () => {
      analisisActualRef.current += 1
    },
    [],
  )

  return { detection, onVideoReady, analizar }
}