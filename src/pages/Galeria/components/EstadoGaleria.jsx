/**
 * Estados de la galería:
 * - loading: esqueletos mientras llega la primera página.
 * - despertando: Render está activando el catálogo; se reintenta solo.
 * - error: no respondió tras los reintentos (o el error no es transitorio).
 * - empty: la consulta no tiene resultados.
 */
function EstadoGaleria({ estado, motivo, busqueda, onRetry, onLimpiar }) {
  if (estado === 'loading') {
    return (
      <div className="gallery-skeletons" aria-label="Cargando contenidos" aria-busy="true">
        {Array.from({ length: 14 }, (_, index) => <span key={index} className="gallery-skeleton" />)}
      </div>
    )
  }

  if (estado === 'despertando') {
    return (
      <section className="gallery-state gallery-state--despertando" role="status" aria-busy="true">
        <span className="gallery-state__spinner" aria-hidden="true" />
        <strong>Estamos preparando tus películas…</strong>
        <p>El catálogo se está activando. Puede tardar hasta un minuto; se cargará solo.</p>
      </section>
    )
  }

  if (estado === 'error') {
    return (
      <section className="gallery-state" role="alert">
        <strong>No pudimos cargar la galería</strong>
        <p>
          {motivo === 'servicio'
            ? 'El catálogo no respondió después de varios intentos. Revisá tu conexión e intentá de nuevo.'
            : 'No pudimos completar la consulta. Intentá de nuevo.'}
        </p>
        <button type="button" onClick={onRetry}>Reintentar</button>
      </section>
    )
  }

  return (
    <section className="gallery-state" role="status">
      <strong>{busqueda ? `No encontramos resultados para «${busqueda}»` : 'No hay contenidos para estos filtros'}</strong>
      <p>{busqueda ? 'Probá con otro nombre o quitá los filtros.' : 'Seleccioná otro filtro para seguir explorando.'}</p>
      {onLimpiar && <button type="button" onClick={onLimpiar}>Quitar filtros</button>}
    </section>
  )
}

export default EstadoGaleria
