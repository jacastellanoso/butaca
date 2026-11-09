import BotonFavorito from '../../../components/BotonFavorito/BotonFavorito.jsx'

/**
 * Tarjeta de película o serie real de TMDB para recomendaciones y favoritos.
 * Los campos ausentes no se muestran ni se reemplazan por valores inventados.
 */
function TarjetaPelicula({ contenido, index = 0, destacada = false, pie, onDetalle }) {
  const { titulo, tipo, anio, calificacion, generos = [], sinopsis } = contenido
  const portada = contenido.portada ?? contenido.poster
  const meta = [tipo, anio, calificacion !== null && calificacion !== undefined ? `★ ${calificacion.toFixed(1)}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="movie-card" style={{ '--card-index': index }}>
      <div className="movie-card__poster">
        {portada ? (
          <img draggable={false} src={portada} alt={`Póster de ${titulo}`} loading="lazy" />
        ) : (
          <span className="movie-card__placeholder" aria-hidden="true">B</span>
        )}
        {destacada && <span className="movie-card__badge">Top {index + 1}</span>}
        <span className="movie-card__favorite">
          <BotonFavorito contenido={contenido} variante="icono" />
        </span>
      </div>

      <div className="movie-card__body">
        <h3 className="movie-card__title">{titulo}</h3>
        {meta && <p className="movie-card__meta">{meta}</p>}
        {generos.length > 0 && (
          <ul className="movie-card__genres" aria-label="Géneros">
            {generos.slice(0, 3).map((genero) => <li key={genero}>{genero}</li>)}
          </ul>
        )}
        {sinopsis && <p className="movie-card__synopsis">{sinopsis}</p>}
        {pie}
        <button className="movie-card__detail" type="button" onClick={() => onDetalle(contenido)}>
          Ver detalle
        </button>
      </div>
    </article>
  )
}

export default TarjetaPelicula
