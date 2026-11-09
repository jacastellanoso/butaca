import { useId, useState } from 'react'

import RecomendacionesRostro from './RecomendacionesRostro.jsx'
import { guardarAnimo } from './services/animos.js'

/**
 * Acciones posteriores al análisis: repetirlo y, solo con autorización
 * explícita, guardar el resultado en el historial emocional.
 *
 * El permiso de cámara NO autoriza a guardar: la casilla empieza desmarcada,
 * se pide en cada resultado y solo viaja la emoción con su confianza.
 *
 * El componente se vuelve a montar con cada análisis (key en RostroDeteccion),
 * así la casilla y el estado de guardado se reinician solos.
 */
function AccionesResultado({ detection, onAnalyze }) {
  const consentId = useId()
  const [autorizado, setAutorizado] = useState(true)
  const [guardado, setGuardado] = useState({ estado: 'idle', mensaje: '', animoId: null })

  const { status, emotion, confidence } = detection
  const analizando = status === 'analyzing'
  const puedeGuardar = status === 'detected'
  const guardando = guardado.estado === 'saving'
  const yaGuardado = guardado.estado === 'saved'

  const handleGuardar = async () => {
    setGuardado({ estado: 'saving', mensaje: '', animoId: null })
    try {
      const animo = await guardarAnimo({ emocion: emotion, confianza: confidence })
      setGuardado({
        estado: 'saved',
        mensaje: 'Guardado en tu historial emocional.',
        animoId: typeof animo?.id === 'string' ? animo.id : null,
      })
    } catch (error) {
      setGuardado({ estado: 'error', mensaje: error.message, animoId: null })
    }
  }

  return (
    <div className="rostro-result">
      {puedeGuardar && (
        <div className="rostro-save">
          <div className="rostro-save__heading">
            <span aria-hidden="true">✓</span>
            <div><strong>Escaneo completado</strong><small>Tu imagen no se almacena.</small></div>
          </div>
          <label className="rostro-save__consent" htmlFor={consentId}>
            <input
              id={consentId}
              type="checkbox"
              checked={autorizado}
              disabled={guardando || yaGuardado}
              onChange={(event) => setAutorizado(event.target.checked)}
            />
            <span>
              Autorizo guardar esta emoción en mi historial para ver cómo cambia mi ánimo.
              Solo se guarda la emoción y su porcentaje, nunca la imagen.
            </span>
          </label>

          <button
            className="rostro-button rostro-button--primary"
            type="button"
            onClick={handleGuardar}
            disabled={!autorizado || guardando || yaGuardado}
            aria-busy={guardando}
          >
            {guardando ? 'Guardando…' : yaGuardado ? 'Guardado' : 'Guardar resultado'}
          </button>

          {guardado.mensaje && (
            <p
              className={`rostro-save__message rostro-save__message--${guardado.estado}`}
              role={guardado.estado === 'error' ? 'alert' : 'status'}
            >
              {guardado.mensaje}
              {guardado.estado === 'error' && guardado.mensaje.startsWith('Iniciá sesión') && (
                <>
                  {' '}
                  <a href="/">Ir a iniciar sesión</a>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* pf20: recomendaciones de la emoción detectada (no requieren guardar). */}
      {yaGuardado && <RecomendacionesRostro emocion={emotion} animoId={guardado.animoId} />}

      <button
        className="rostro-button rostro-button--secondary"
        type="button"
        onClick={onAnalyze}
        disabled={analizando || guardando}
      >
        {analizando ? 'Analizando…' : 'Analizar de nuevo'}
      </button>
    </div>
  )
}

export default AccionesResultado
