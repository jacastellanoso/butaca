function EstadoGaleria({ estado, onRetry }) {
  if (estado === 'loading') {
    return (
      <div className="gallery-skeletons" aria-label="Cargando contenidos" aria-busy="true">
        {Array.from({ length: 14 }, (_, index) => <span key={index} className="gallery-skeleton" />)}
      </div>
    )
  }

  const isError = estado === 'error'

  return (
    <section className="gallery-state" role={isError ? 'alert' : 'status'}>
      <strong>{isError ? 'No pudimos cargar la galería' : 'No hay contenidos en esta categoría'}</strong>
      <p>{isError ? 'Inténtalo nuevamente.' : 'Selecciona otro filtro para seguir explorando.'}</p>
      {isError && <button type="button" onClick={onRetry}>Reintentar</button>}
    </section>
  )
}

export default EstadoGaleria
