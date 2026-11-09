import { useCallback, useRef, useState } from 'react'

import { obtenerDetalleCatalogo } from '../pages/Galeria/services/catalogo.js'

/**
 * Abre el detalle de un contenido mostrando primero los datos que ya se
 * tienen y completándolos con GET /api/catalogo/:tipo/:tmdbId (géneros,
 * sinopsis, año). Si el detalle falla se conserva la información base.
 */
export function useDetalleContenido() {
  const [seleccionado, setSeleccionado] = useState(null)
  const solicitud = useRef(0)

  const abrir = useCallback(async (base) => {
    const id = ++solicitud.current
    const inicial = {
      generos: [],
      sinopsis: '',
      anio: null,
      calificacion: null,
      portada: base.poster ?? null,
      ...base,
    }
    setSeleccionado(inicial)

    try {
      const detalle = await obtenerDetalleCatalogo(base.tipoTmdb, base.tmdbId)
      if (id !== solicitud.current || !detalle) return
      setSeleccionado({
        ...inicial,
        generos: Array.isArray(detalle.generos) ? detalle.generos : inicial.generos,
        sinopsis: typeof detalle.sinopsis === 'string' ? detalle.sinopsis : inicial.sinopsis,
        anio: Number.isInteger(detalle.anio) ? detalle.anio : inicial.anio,
        calificacion: typeof detalle.calificacion === 'number' ? detalle.calificacion : inicial.calificacion,
        portada: inicial.portada ?? detalle.portada ?? null,
      })
    } catch {
      // Sin detalle se muestra la información disponible.
    }
  }, [])

  const cerrar = useCallback(() => {
    solicitud.current += 1
    setSeleccionado(null)
  }, [])

  return { seleccionado, abrir, cerrar }
}
