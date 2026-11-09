import { EMOTIONS } from './emotions.js'

const STATUS_CONTENT = {
  ready: {
    title: 'Cámara lista',
    message: 'Mirá de frente a la cámara con buena iluminación.',
  },
  analyzing: {
    title: 'Analizando tu expresión',
    message: 'Mantené el rostro dentro del recuadro unos segundos.',
  },
  detected: {
    title: 'Emoción detectada',
  },
  inconclusive: {
    title: 'No pudimos identificar tu expresión',
    message: 'Acercate un poco, mejorá la luz y mirá de frente.',
  },
  error: {
    title: 'Algo salió mal',
    message: 'No fue posible analizar tu expresión.',
  },
}

/**
 * Presenta el estado de la detección. No detecta emociones por sí mismo:
 * recibe el resultado desde afuera (face-api.js, integrado en `pf17_FaceAPI`).
 *
 * status: 'ready' | 'analyzing' | 'detected' | 'inconclusive' | 'error'
 * emotion: clave de EMOTIONS (expresión dominante de face-api.js).
 * confidence: probabilidad entre 0 y 1 de esa expresión.
 * message: texto opcional que reemplaza la descripción por defecto.
 */
function EmotionStatus({ status = 'ready', emotion, confidence, message }) {
  const content = STATUS_CONTENT[status] ?? STATUS_CONTENT.error
  const detectedEmotion = status === 'detected' ? EMOTIONS[emotion] : null
  const percentage =
    typeof confidence === 'number'
      ? Math.round(Math.min(Math.max(confidence, 0), 1) * 100)
      : null

  return (
    <div
      className={`emotion-status emotion-status--${status}`}
      role="status"
      aria-live="polite"
    >
      <span className="emotion-status__indicator" aria-hidden="true" />

      <div className="emotion-status__body">
        <p className="emotion-status__title">
          {content.title}
          {detectedEmotion && (
            <strong className="emotion-status__emotion">
              {detectedEmotion.label}
            </strong>
          )}
        </p>
        <p className="emotion-status__message">
          {message ?? detectedEmotion?.description ?? content.message}
        </p>

        {detectedEmotion && percentage !== null && (
          <div className="emotion-status__confidence">
            <span
              className="emotion-status__meter"
              role="meter"
              aria-label="Nivel de confianza"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
            >
              <span style={{ width: `${percentage}%` }} />
            </span>
            <span className="emotion-status__percentage">{percentage} %</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmotionStatus
