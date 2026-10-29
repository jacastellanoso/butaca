import { useEffect, useRef } from 'react'

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

  return (
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
            {[contenido.tipo, contenido.anio, contenido.generos.join(', ')].filter(Boolean).join(' · ')}
          </p>
          <p>{contenido.sinopsis}</p>
          {contenido.calificacion !== null && <p>Calificación: {contenido.calificacion}</p>}
          <button className="content-detail__favorite" type="button" disabled title="La persistencia se implementará en pf16">
            Favoritos · Próximamente
          </button>
        </div>
      </section>
    </div>
  )
}

export default DetalleContenido
