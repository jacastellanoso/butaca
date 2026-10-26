import { useCallback, useEffect, useRef, useState } from 'react'

// Solo se solicita video. No se graba, no se capturan fotogramas y no se
// almacena ninguna imagen: el flujo vive únicamente en memoria del navegador.
const CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
}

export const CAMERA_ERRORS = {
  denied: 'Bloqueaste el acceso a la cámara. Habilitalo desde la configuración del navegador e intentá de nuevo.',
  notFound: 'No encontramos ninguna cámara disponible en este dispositivo.',
  busy: 'La cámara está siendo usada por otra aplicación. Cerrala e intentá de nuevo.',
  insecure: 'La cámara solo funciona en conexiones seguras (HTTPS o localhost).',
  unsupported: 'Este navegador no permite usar la cámara.',
  interrupted: 'La cámara se desconectó. Volvé a activarla para continuar.',
  unknown: 'No fue posible activar la cámara. Intentá de nuevo.',
}

function getCameraError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'notFound'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy'
    default:
      return 'unknown'
  }
}

function stopStream(stream) {
  stream?.getTracks().forEach((track) => {
    track.onended = null
    track.stop()
  })
}

/**
 * Controla el ciclo de vida de la cámara frontal.
 *
 * status: 'idle' | 'requesting' | 'active' | 'error'
 * error: clave de CAMERA_ERRORS cuando status es 'error'.
 */
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const isMountedRef = useRef(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const releaseStream = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const stop = useCallback(() => {
    releaseStream()
    setError(null)
    setStatus('idle')
  }, [releaseStream])

  const fail = useCallback(
    (reason) => {
      releaseStream()
      setError(reason)
      setStatus('error')
    },
    [releaseStream],
  )

  const start = useCallback(async () => {
    if (streamRef.current) {
      return
    }

    if (!window.isSecureContext) {
      fail('insecure')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      fail('unsupported')
      return
    }

    setError(null)
    setStatus('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)

      // La pantalla pudo cerrarse mientras el navegador pedía el permiso.
      if (!isMountedRef.current) {
        stopStream(stream)
        return
      }

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => fail('interrupted')
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }

      setStatus('active')
    } catch (cameraError) {
      if (isMountedRef.current) {
        console.error('No fue posible activar la cámara.', cameraError)
        fail(getCameraError(cameraError))
      }
    }
  }, [fail])

  // Libera la cámara al abandonar la pantalla o cerrar la pestaña.
  useEffect(() => {
    isMountedRef.current = true
    window.addEventListener('pagehide', releaseStream)

    return () => {
      isMountedRef.current = false
      window.removeEventListener('pagehide', releaseStream)
      releaseStream()
    }
  }, [releaseStream])

  return { videoRef, status, error, start, stop }
}
