import { useEffect, useState } from 'react'

import { EVENTO_NAVEGACION, leerRuta } from '../lib/rutas.js'

/** Ruta actual a partir de location.pathname; se actualiza con cada navegación y con Atrás/Adelante. */
export function useRuta() {
  const [ruta, setRuta] = useState(() => window.location.pathname)

  useEffect(() => {
    const actualizar = () => setRuta(window.location.pathname)
    window.addEventListener(EVENTO_NAVEGACION, actualizar)
    return () => window.removeEventListener(EVENTO_NAVEGACION, actualizar)
  }, [])

  return { ruta, ...leerRuta(ruta) }
}
