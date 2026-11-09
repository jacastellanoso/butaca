import { useState } from 'react'

import { useFavoritos } from '../../context/favoritosContexto.js'
import './BotonFavorito.css'

export function IconoCorazon({ lleno = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z"
        fill={lleno ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Agrega o quita un contenido real de TMDB de los favoritos (library-service).
 * variante 'pastilla' (detalle) o 'icono' (sobre la tarjeta).
 * Contenidos de demostración o sin sesión: el botón queda deshabilitado.
 */
function BotonFavorito({ contenido, variante = 'pastilla' }) {
  const favoritos = useFavoritos()
  const [error, setError] = useState('')

  const valido = favoritos && contenido && !contenido.esDemostracion &&
    Number.isSafeInteger(contenido.tmdbId) && ['movie', 'tv'].includes(contenido.tipoTmdb)
  const activo = valido && favoritos.esFavorito(contenido.tipoTmdb, contenido.tmdbId)
  const pendiente = valido && favoritos.estaPendiente(contenido.tipoTmdb, contenido.tmdbId)
  const etiqueta = activo ? 'Quitar de favoritos' : 'Agregar a favoritos'

  const handleClick = async (event) => {
    event.stopPropagation()
    setError('')
    try {
      await favoritos.alternar(contenido)
    } catch (fallo) {
      setError(fallo.message)
    }
  }

  if (!valido) {
    return variante === 'icono' ? null : (
      <button className="boton-favorito boton-favorito--pastilla" type="button" disabled>
        <IconoCorazon />
        <span>{contenido?.esDemostracion ? 'No disponible en demostración' : 'Favoritos no disponibles'}</span>
      </button>
    )
  }

  return (
    <span className={`boton-favorito-envoltura boton-favorito-envoltura--${variante}`}>
      <button
        className={`boton-favorito boton-favorito--${variante}${activo ? ' boton-favorito--activo' : ''}`}
        type="button"
        onClick={handleClick}
        disabled={pendiente}
        aria-pressed={activo}
        aria-busy={pendiente}
        aria-label={variante === 'icono' ? `${etiqueta}: ${contenido.titulo}` : undefined}
        title={variante === 'icono' ? etiqueta : undefined}
      >
        <IconoCorazon lleno={activo} />
        {variante === 'pastilla' && <span>{pendiente ? 'Guardando…' : etiqueta}</span>}
      </button>
      {error && (
        <span className="boton-favorito__error" role="alert">
          {error}
        </span>
      )}
    </span>
  )
}

export default BotonFavorito
