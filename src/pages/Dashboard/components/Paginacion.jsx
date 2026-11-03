/** Controles anterior/siguiente para listados paginados por el backend. */
function Paginacion({ paginacion, onChange, etiqueta }) {
  if (!paginacion || paginacion.totalPaginas <= 1) return null
  const { pagina, totalPaginas, total } = paginacion

  return (
    <nav className="dash-pagination" aria-label={etiqueta}>
      <button className="dash-button dash-button--ghost" type="button" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
        Anterior
      </button>
      <span>
        Página {pagina} de {totalPaginas} · {total} registros
      </span>
      <button
        className="dash-button dash-button--ghost"
        type="button"
        disabled={pagina >= totalPaginas}
        onClick={() => onChange(pagina + 1)}
      >
        Siguiente
      </button>
    </nav>
  )
}

export default Paginacion
