function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v.6l3.4-2.1A1 1 0 0 1 21 6.8v10.4a1 1 0 0 1-1.6.8L16 15.9v.6a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 16.5z" />
    </svg>
  )
}

/**
 * Solicitud de consentimiento previa a la activación de la cámara.
 * `declined` muestra la variante posterior a rechazar el permiso.
 */
function CameraConsent({ declined = false, isRequesting = false, onAccept, onDecline }) {
  return (
    <div className="camera-consent">
      <span className="camera-consent__icon">
        <CameraIcon />
      </span>

      <h2 id="camera-consent-title" className="camera-consent__title">
        {declined ? 'La cámara está desactivada' : 'Necesitamos tu cámara'}
      </h2>

      <p className="camera-consent__text">
        {declined
          ? 'Sin la cámara no podemos analizar tu expresión. Podés activarla cuando quieras.'
          : 'Butaca necesita acceder a tu cámara para analizar tus expresiones faciales y ofrecerte recomendaciones personalizadas.'}
      </p>

      <p className="camera-consent__privacy">
        No guardamos imágenes ni videos.
      </p>

      <div className="camera-consent__actions">
        <button
          className="rostro-button rostro-button--primary"
          type="button"
          onClick={onAccept}
          disabled={isRequesting}
          aria-busy={isRequesting}
        >
          {isRequesting ? 'Esperando permiso…' : 'Activar cámara'}
        </button>

        {!declined && (
          <button
            className="rostro-button rostro-button--secondary"
            type="button"
            onClick={onDecline}
            disabled={isRequesting}
          >
            Ahora no
          </button>
        )}
      </div>
    </div>
  )
}

export default CameraConsent
