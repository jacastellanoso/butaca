import AccionesResultado from './AccionesResultado.jsx'
import Rostro from './Rostro.jsx'
import { useFaceDetection } from './deteccion/useFaceDetection.js'

/**
 * Une la pantalla de Rostro (diseño de pf4) con face-api.js (pf17).
 * Rostro sigue sin saber cómo se detecta: solo recibe `detection`.
 */
function RostroDeteccion() {
  const { detection, onVideoReady, analizar } = useFaceDetection()

  // key: cada análisis nuevo reinicia la casilla de autorización y el guardado.
  const claveResultado = `${detection.status}-${detection.emotion ?? ''}-${detection.confidence ?? ''}`

  return (
    <Rostro detection={detection} onVideoReady={onVideoReady}>
      <AccionesResultado key={claveResultado} detection={detection} onAnalyze={analizar} />
    </Rostro>
  )
}

export default RostroDeteccion