import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import BotonFavorito from '../../../components/BotonFavorito/BotonFavorito.jsx'

function DetalleContenido({ contenido, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflowAnterior }
  }, [])

  const modal = (
    <div
      className="content-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="content-detail" role="dialog" aria-modal="true" aria-labelledby="content-detail-title">
        <button ref={closeRef} className="content-detail__close" type="button" onClick={onClose} aria-label="Cerrar detalle">
          ×
        </button>
        <div className="content-detail__poster">
          {contenido.portada ? (
            <img src={contenido.portada} alt={`Portada de ${contenido.titulo}`} />
          ) : (
            <span aria-hidden="true">B</span>
          )}
        </div>
        <div className="content-detail__body">
          {contenido.esDemostracion && <span className="content-detail__demo">Datos de demostración</span>}
          <h2 id="content-detail-title">{contenido.titulo}</h2>
          <p className="content-detail__meta">
            {[contenido.tipo, contenido.anio, (contenido.generos ?? []).join(', ')].filter(Boolean).join(' · ')}
          </p>
          <p>{contenido.sinopsis}</p>
          {contenido.calificacion !== null && contenido.calificacion !== undefined && (
            <div className="content-detail__rating" aria-label={`Calificación ${contenido.calificacion} de 10`}>
              <span aria-hidden="true">★</span>
              <strong>{Number(contenido.calificacion).toFixed(1)}</strong>
              <small>/ 10</small>
            </div>
          )}
          {/* Favoritos reales en library-service (pf16), conectados en pf20. */}
          <BotonFavorito contenido={contenido} />
        </div>
      </section>
    </div>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}

export default DetalleContenido
