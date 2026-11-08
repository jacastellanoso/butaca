import { useEffect, useState } from 'react'

import { rutaDeRecomendaciones } from '../../lib/rutas.js'
import { DESTACADAS_POR_ANIMO, registrarRecomendacionesDestacadas } from '../../services/biblioteca.js'
import { obtenerRecomendaciones } from '../../services/recomendaciones.js'
import { EMOTIONS } from './emotions.js'

const VISTA_PREVIA = 6

/**
 * Recomendaciones para la emoción recién detectada (pf20).
 * - La consulta usa `emocion` y no guarda nada.
 * - Solo si el usuario autorizó guardar el resultado (animoId), las
 *   destacadas se registran en su historial de recomendaciones.
 */
/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con recommendations-service */
function RecomendacionesRostro({ emocion, animoId }) {
  const [estado, setEstado] = useState('loading')
  const [resultados, setResultados] = useState([])
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState('idle')

  useEffect(() => {
    let activo = true
    setEstado('loading')
    obtenerRecomendaciones({ emocion, tipo: 'movie' })
      .then((respuesta) => {
        if (!activo) return
        setResultados(respuesta.resultados)
        setEstado('ready')
      })
      .catch((fallo) => {
        if (!activo) return
        setError(fallo.message)
        setEstado('error')
      })
    return () => {
      activo = false
    }
  }, [emocion])

  useEffect(() => {
    if (!animoId || estado !== 'ready' || resultados.length === 0) return
    setHistorial('saving')
    registrarRecomendacionesDestacadas({ animoId, emocion, resultados })
      .then(() => setHistorial('saved'))
      .catch(() => setHistorial('error'))
  }, [animoId, emocion, estado, resultados])

  const enlace = rutaDeRecomendaciones({ emocion, animoId })

  return (
    <section className="rostro-recs" aria-labelledby="rostro-recs-title">
      <div className="rostro-recs__head">
        <h2 id="rostro-recs-title">Para tu {EMOTIONS[emocion]?.label.toLowerCase() ?? 'ánimo'}</h2>
        <a className="rostro-recs__all" href={enlace}>Ver todas</a>
      </div>

      {estado === 'loading' && (
        <div className="rostro-recs__calculating" aria-busy="true" aria-label="Calculando tu experiencia Butaca">
          <span className="rostro-recs__orb" aria-hidden="true">B</span>
          <div><strong>Calculando tu experiencia Butaca…</strong><small>Combinando tu emoción con historias para vos.</small></div>
        </div>
      )}

      {estado === 'error' && (
        <p className="rostro-recs__message" role="alert">
          {error}
        </p>
      )}

      {estado === 'ready' && resultados.length === 0 && (
        <p className="rostro-recs__message">No encontramos recomendaciones para esta emoción.</p>
      )}

      {estado === 'ready' && resultados.length > 0 && (
        <ul className="rostro-recs__row">
          {resultados.slice(0, VISTA_PREVIA).map((item, index) => (
            <li key={item.id} style={{ '--rec-index': index }}>
              <a className="rostro-recs__card" href={enlace} title={item.titulo}>
                {item.poster ? <img draggable={false} src={item.poster} alt={`Póster de ${item.titulo}`} loading="lazy" /> : <span aria-hidden="true">B</span>}
                <strong>{item.titulo}</strong>
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="rostro-recs__note" role="status">
        {historial === 'saved' && `Guardamos las ${DESTACADAS_POR_ANIMO} recomendaciones destacadas en tu historial.`}
        {historial === 'error' && 'No pudimos guardar estas recomendaciones en tu historial.'}
        {historial === 'idle' && !animoId && 'Si no guardás el resultado, estas recomendaciones no quedan en tu historial.'}
      </p>
    </section>
  )
}

export default RecomendacionesRostro
