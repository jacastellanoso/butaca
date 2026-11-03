import { createContext, useContext } from 'react'

// Favoritos del usuario autenticado compartidos por galería, recomendaciones
// y dashboard. Fuera de FavoritosProvider vale null (por ejemplo, sin sesión).
export const FavoritosContexto = createContext(null)

export const useFavoritos = () => useContext(FavoritosContexto)

export const claveContenido = (tipoTmdb, tmdbId) => `${tipoTmdb}-${tmdbId}`
