import { useEffect } from 'react'

/**
 * Alto (px) que el teclado virtual tapa de la ventana, a partir de visualViewport.
 * Lógica pura para poder probarla sin navegador.
 */
export function altoTecladoVisible({ innerHeight, visualHeight, offsetTop = 0 }) {
  if (!Number.isFinite(innerHeight) || !Number.isFinite(visualHeight)) return 0
  const tapado = Math.round(innerHeight - visualHeight - offsetTop)
  // Menos de 80 px son barras del navegador que aparecen o se ocultan, no el teclado.
  return tapado >= 80 ? tapado : 0
}

/**
 * Publica en --teclado-alto (sobre el elemento indicado) cuánto tapa el
 * teclado. En iOS Safari y en Chrome Android el teclado se superpone a la
 * página sin achicar 100dvh: sin este espacio extra, los últimos campos y el
 * botón quedan debajo del teclado y no hay lugar para desplazarlos arriba.
 */
export function useTecladoVirtual(ref) {
  useEffect(() => {
    const viewport = window.visualViewport
    const elemento = ref.current
    if (!viewport || !elemento) return undefined

    const actualizar = () => {
      const alto = altoTecladoVisible({
        innerHeight: window.innerHeight,
        visualHeight: viewport.height,
        offsetTop: viewport.offsetTop,
      })
      elemento.style.setProperty('--teclado-alto', `${alto}px`)
      // Con el teclado abierto se mantiene visible el campo enfocado.
      const enfocado = document.activeElement
      if (alto && enfocado instanceof HTMLElement && elemento.contains(enfocado)) {
        enfocado.scrollIntoView?.({ block: 'center' })
      }
    }

    actualizar()
    viewport.addEventListener('resize', actualizar)
    viewport.addEventListener('scroll', actualizar)
    return () => {
      viewport.removeEventListener('resize', actualizar)
      viewport.removeEventListener('scroll', actualizar)
      elemento.style.removeProperty('--teclado-alto')
    }
  }, [ref])
}
