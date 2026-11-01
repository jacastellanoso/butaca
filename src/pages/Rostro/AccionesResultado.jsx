import { useId, useState } from 'react'

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
  const [autorizado, setAutorizado] = useState(false)
  const [guardado, setGuardado] = useState({ estado: 'idle', mensaje: '' })

  const { status, emotion, confidence } = detection
  const analizando = status === 'analyzing'
  const puedeGuardar = status === 'detected'
  const guardando = guardado.estado === 'saving'
  const yaGuardado = guardado.estado === 'saved'

  const handleGuardar = async () => {
    setGuardado({ estado: 'saving', mensaje: '' })
    try {
      await guardarAnimo({ emocion: emotion, confianza: confidence })
      setGuardado({ estado: 'saved', mensaje: 'Guardado en tu historial emocional.' })
    } catch (error) {
      setGuardado({ estado: 'error', mensaje: error.message })
    }
  }

  return (
    <div className="rostro-result">
      {puedeGuardar && (
        <div className="rostro-save">
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
                  <a href="#">Ir a iniciar sesión</a>
                </>
              )}
            </p>
          )}
        </div>
      )}

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