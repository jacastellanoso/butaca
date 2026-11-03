/**
 * Estados de carga, error y vacío de las secciones del dashboard.
 * estado: 'loading' | 'error' | 'empty'
 */
function EstadoPanel({ estado, titulo, mensaje, onRetry, accion, filas = 3 }) {
  if (estado === 'loading') {
    return (
      <div className="dash-loading" aria-busy="true" aria-label={titulo ?? 'Cargando'}>
        {Array.from({ length: filas }, (_, index) => (
          <span key={index} className="dash-skeleton" style={{ '--skeleton-index': index }} />
        ))}
      </div>
    )
  }

  const esError = estado === 'error'
  return (
    <div className={`dash-state dash-state--${estado}`} role={esError ? 'alert' : 'status'}>
      <span className="dash-state__icon" aria-hidden="true">{esError ? '!' : 'B'}</span>
      <strong>{titulo}</strong>
      {mensaje && <p>{mensaje}</p>}
      <div className="dash-state__actions">
        {esError && onRetry && (
          <button className="dash-button dash-button--primary" type="button" onClick={onRetry}>
            Reintentar
          </button>
        )}
        {accion}
      </div>
    </div>
  )
}

export default EstadoPanel
