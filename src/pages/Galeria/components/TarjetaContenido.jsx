function TarjetaContenido({ contenido, index, onSelect }) {
  return (
    <button
      className="content-card"
      type="button"
      style={{ '--card-index': index }}
      onClick={() => onSelect(contenido)}
      aria-label={`Ver detalles de ${contenido.titulo}`}
    >
      {contenido.portada ? (
        <img src={contenido.portada} alt={`Portada de ${contenido.titulo}`} />
      ) : (
        <span className="content-card__placeholder" aria-hidden="true">
          <span className="content-card__mark">B</span>
        </span>
      )}
      <span className="content-card__overlay">
        <strong>{contenido.titulo}</strong>
        <span>{contenido.tipo}</span>
      </span>
    </button>
  )
}

export default TarjetaContenido
