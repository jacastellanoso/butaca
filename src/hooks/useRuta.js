import { useEffect, useState } from 'react'

import { leerRuta } from '../lib/rutas.js'

/** Ruta actual a partir del hash; se actualiza con cada hashchange. */
export function useRuta() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const actualizar = () => setHash(window.location.hash)
    window.addEventListener('hashchange', actualizar)
    return () => window.removeEventListener('hashchange', actualizar)
  }, [])

  return { hash, ...leerRuta(hash) }
}
