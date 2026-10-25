import { useState } from 'react'

import '../Main/Main.css'
import './Rostro.css'

import cuadroEfecto from '../../assets/decorations/cuadroefecto.svg'
import lentes from '../../assets/images/lentesdiseño.png'
import palomitas from '../../assets/images/palomitasdiseño.png'
import rollo from '../../assets/images/rollodiseño.png'
import ticket from '../../assets/images/ticketdiseño.png'
import CameraConsent from './CameraConsent.jsx'
import EmotionStatus from './EmotionStatus.jsx'
import { CAMERA_ERRORS, useCamera } from './useCamera.js'

const waveLayers = [1, 2, 3, 4]

function WaveGroup({ position }) {
  return (
    <div className={`wave-group wave-group--${position}`} aria-hidden="true">
      {waveLayers.map((layer) => (
        <img
          key={layer}
          className={`wave wave--${layer}`}
          src={cuadroEfecto}
          alt=""
        />
      ))}
    </div>
  )
}

function CameraError({ reason, onRetry }) {
  return (
    <div className="camera-consent camera-consent--error" role="alert">
      <span className="camera-consent__icon" aria-hidden="true">
        !
      </span>
      <h2 className="camera-consent__title">No pudimos activar la cámara</h2>
      <p className="camera-consent__text">
        {CAMERA_ERRORS[reason] ?? CAMERA_ERRORS.unknown}
      </p>
      <div className="camera-consent__actions">
        <button
          className="rostro-button rostro-button--primary"
          type="button"
          onClick={onRetry}
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}

/**
 * Pantalla de cámara, consentimiento y estado de detección de emociones.
 *
 * Puntos de integración para `pf10_FaceAPI`:
 * - onVideoReady(video): recibe el <video> en vivo cuando hay imagen y
 *   `null` cuando la cámara se apaga. Ese elemento es la entrada de face-api.js.
 * - detection: { status, emotion, confidence, message } con el resultado a
 *   mostrar en EmotionStatus. Sin este valor, la pantalla muestra "Cámara lista".
 */
function Rostro({ detection, onVideoReady }) {
  const { videoRef, status, error, start, stop } = useCamera()
  const [consent, setConsent] = useState('pending')

  const isActive = status === 'active'
  const isRequesting = status === 'requesting'
  const detectionStatus = detection?.status ?? 'ready'

  const handleAccept = () => {
    setConsent('granted')
    start()
  }

  const handleDecline = () => {
    setConsent('declined')
  }

  const handleStop = () => {
    stop()
    setConsent('declined')
  }

  return (
    <main className="rostro-page">
      <div className="background" aria-hidden="true">
        <WaveGroup position="top-left" />
        <WaveGroup position="bottom-right" />
      </div>

      <div className="decorations" aria-hidden="true">
        <img className="decoration decoration--reel" src={rollo} alt="" />
        <img className="decoration decoration--glasses" src={lentes} alt="" />
        <img className="decoration decoration--ticket" src={ticket} alt="" />
        <img className="decoration decoration--popcorn" src={palomitas} alt="" />
      </div>

      <div className="rostro-scroll">
        <section className="rostro-content" aria-labelledby="rostro-title">
          <header className="rostro-header">
            <h1 id="rostro-title" className="rostro-title">
              ¿Cómo te <span className="rostro-title__highlight">sentís</span> hoy?
            </h1>
            <p className="rostro-subtitle">
              Dejá que tu expresión elija la película.
            </p>
          </header>

          <div
            className={`camera-stage camera-stage--${status}`}
            data-detection={isActive ? detectionStatus : undefined}
          >
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              muted
              playsInline
              aria-label="Vista previa de tu cámara"
              hidden={!isActive}
              onLoadedData={(event) => onVideoReady?.(event.currentTarget)}
              onEmptied={() => onVideoReady?.(null)}
            />

            {isActive && (
              <div className="face-guide" aria-hidden="true">
                <span className="face-guide__frame" />
                <span className="face-guide__scan" />
              </div>
            )}

            {status === 'error' && (
              <CameraError reason={error} onRetry={start} />
            )}

            {!isActive && status !== 'error' && (
              <CameraConsent
                declined={consent === 'declined'}
                isRequesting={isRequesting}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            )}
          </div>

          {isActive && (
            <div className="rostro-panel">
              <EmotionStatus
                status={detectionStatus}
                emotion={detection?.emotion}
                confidence={detection?.confidence}
                message={detection?.message}
              />

              <button
                className="rostro-button rostro-button--secondary rostro-button--stop"
                type="button"
                onClick={handleStop}
              >
                Apagar cámara
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Rostro
