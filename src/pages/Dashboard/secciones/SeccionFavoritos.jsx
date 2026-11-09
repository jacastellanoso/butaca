import { useMemo, useState } from 'react'

import { useFavoritos } from '../../../context/favoritosContexto.js'
import { useDetalleContenido } from '../../../hooks/useDetalleContenido.js'
import DetalleContenido from '../../Galeria/components/DetalleContenido.jsx'
import EstadoPanel from '../components/EstadoPanel.jsx'
import TarjetaPelicula from '../components/TarjetaPelicula.jsx'
import { formatearFecha } from '../formato.js'

const FILTROS = [
  { valor: '', etiqueta: 'Todo' },
  { valor: 'movie', etiqueta: 'Películas' },
  { valor: 'tv', etiqueta: 'Series' },
]

/** Favoritos del usuario autenticado (library-service, /api/favoritos). */
function SeccionFavoritos() {
  const favoritos = useFavoritos()
  const [tipo, setTipo] = useState('')
  const { seleccionado, abrir, cerrar } = useDetalleContenido()

  const lista = useMemo(
    () => (favoritos?.favoritos ?? []).filter((favorito) => !tipo || favorito.tipoTmdb === tipo),
    [favoritos, tipo],
  )

  return (
    <section className="dash-section" aria-labelledby="dash-favoritos-title">
      <div className="dash-section__head">
        <div>
          <h2 id="dash-favoritos-title">Mis favoritos</h2>
          <p>Las películas y series que guardaste. Tocá el corazón para quitarlas.</p>
        </div>
        <a className="dash-button dash-button--primary" href="/galeria">Explorar la galería</a>
      </div>

      <div className="rec-controls">
        <div className="dash-segmented" role="group" aria-label="Filtrar por tipo">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button key={valor || 'todo'} type="button" aria-pressed={tipo === valor} onClick={() => setTipo(valor)}>
              {etiqueta}
            </button>
          ))}
        </div>
        {favoritos?.estado === 'ready' && (
          <span className="dash-count">
            {favoritos.favoritos.length} {favoritos.favoritos.length === 1 ? 'favorito' : 'favoritos'}
          </span>
        )}
      </div>

      {(!favoritos || favoritos.estado === 'loading') && <EstadoPanel estado="loading" titulo="Cargando favoritos" filas={6} />}
      {favoritos?.estado === 'error' && (
        <EstadoPanel estado="error" titulo="No pudimos cargar tus favoritos" mensaje={favoritos.error} onRetry={favoritos.cargar} />
      )}
      {favoritos?.estado === 'ready' && lista.length === 0 && (
        <EstadoPanel
          estado="empty"
          titulo={tipo ? 'No hay favoritos de este tipo' : 'Todavía no tenés favoritos'}
          mensaje="Agregalos con el corazón desde la galería o desde tus recomendaciones."
          accion={<a className="dash-button dash-button--primary" href="/recomendaciones">Ver recomendaciones</a>}
        />
      )}
      {favoritos?.estado === 'ready' && lista.length > 0 && (
        <div className="movie-grid">
          {lista.map((favorito, index) => (
            <TarjetaPelicula
              key={favorito.id}
              contenido={{ ...favorito, id: `${favorito.tipoTmdb}-${favorito.tmdbId}` }}
              index={index}
              pie={<p className="movie-card__added">Agregado el {formatearFecha(favorito.creadoEn)}</p>}
              onDetalle={abrir}
            />
          ))}
        </div>
      )}

      {seleccionado && <DetalleContenido contenido={seleccionado} onClose={cerrar} />}
    </section>
  )
}

export default SeccionFavoritos
