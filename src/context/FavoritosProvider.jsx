import { useCallback, useEffect, useMemo, useState } from 'react'

import { agregarFavorito, eliminarFavorito, listarFavoritos } from '../services/biblioteca.js'
import { claveContenido, FavoritosContexto } from './favoritosContexto.js'

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con library-service */
function FavoritosProvider({ usuarioId, children }) {
  const [estado, setEstado] = useState('loading')
  const [error, setError] = useState('')
  const [favoritos, setFavoritos] = useState([])
  // Claves de contenido con una operación en curso, para deshabilitar el botón.
  const [pendientes, setPendientes] = useState(() => new Set())

  const cargar = useCallback(async () => {
    setEstado('loading')
    setError('')
    try {
      setFavoritos(await listarFavoritos())
      setEstado('ready')
    } catch (fallo) {
      setError(fallo.message)
      setEstado('error')
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar, usuarioId])

  const porClave = useMemo(
    () => new Map(favoritos.map((favorito) => [claveContenido(favorito.tipoTmdb, favorito.tmdbId), favorito])),
    [favoritos],
  )

  const marcar = (clave, activo) =>
    setPendientes((actuales) => {
      const siguientes = new Set(actuales)
      if (activo) siguientes.add(clave)
      else siguientes.delete(clave)
      return siguientes
    })

  /** Agrega o quita un contenido ({ tmdbId, tipoTmdb, titulo, poster }). Lanza ApiError si falla. */
  const alternar = useCallback(async (contenido) => {
    const clave = claveContenido(contenido.tipoTmdb, contenido.tmdbId)
    const existente = porClave.get(clave)
    marcar(clave, true)
    try {
      if (existente) {
        await eliminarFavorito(existente.id)
        setFavoritos((lista) => lista.filter((favorito) => favorito.id !== existente.id))
      } else {
        const nuevo = await agregarFavorito({ ...contenido, poster: contenido.poster ?? contenido.portada })
        setFavoritos((lista) => [nuevo, ...lista.filter((favorito) => favorito.id !== nuevo.id)])
      }
    } finally {
      marcar(clave, false)
    }
  }, [porClave])

  const valor = useMemo(() => ({
    estado,
    error,
    favoritos,
    cargar,
    alternar,
    esFavorito: (tipoTmdb, tmdbId) => porClave.has(claveContenido(tipoTmdb, tmdbId)),
    estaPendiente: (tipoTmdb, tmdbId) => pendientes.has(claveContenido(tipoTmdb, tmdbId)),
  }), [estado, error, favoritos, cargar, alternar, porClave, pendientes])

  return <FavoritosContexto.Provider value={valor}>{children}</FavoritosContexto.Provider>
}

export default FavoritosProvider
