function FiltrosGaleria({ categorias, activa, onChange }) {
  return (
    <div className="gallery-filters" aria-label="Filtrar por género">
      {categorias.map((categoria) => (
        <button
          key={categoria}
          className={`gallery-filter${activa === categoria ? ' gallery-filter--active' : ''}`}
          type="button"
          aria-pressed={activa === categoria}
          onClick={() => onChange(categoria)}
        >
          {categoria}
        </button>
      ))}
    </div>
  )
}

export default FiltrosGaleria
