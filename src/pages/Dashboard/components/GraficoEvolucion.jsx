import { useEffect, useRef, useState } from 'react'

import { COLORES_EMOCION, EMOCIONES_ORDEN } from '../estadisticas.js'
import { etiquetaEmocion, etiquetaPeriodo } from '../formato.js'

const ALTO = 240
const MARGEN = { arriba: 14, derecha: 8, abajo: 30, izquierda: 30 }
const SEPARACION = 2 // hueco de superficie entre segmentos apilados

function useAncho(ref) {
  const [ancho, setAncho] = useState(0)
  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return undefined
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.floor(entrada.contentRect.width)))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ref])
  return ancho
}

// Rectángulo con las esquinas superiores redondeadas (extremo de dato) y la base recta.
function columnaRedondeada(x, y, ancho, alto, radio) {
  const r = Math.min(radio, ancho / 2, alto)
  return `M${x},${y + alto}V${y + r}Q${x},${y} ${x + r},${y}H${x + ancho - r}Q${x + ancho},${y} ${x + ancho},${y + r}V${y + alto}Z`
}

function marcasEje(maximo) {
  const paso = Math.max(1, Math.ceil(maximo / 4))
  const tope = Math.max(paso, Math.ceil(maximo / paso) * paso)
  const marcas = []
  for (let valor = 0; valor <= tope; valor += paso) marcas.push(valor)
  return { tope, marcas }
}

/**
 * Columnas apiladas: cuántos registros de cada emoción hubo por periodo.
 * Hover o foco sobre una columna muestra el desglose; la leyenda nombra cada
 * color y la tabla (en la sección) ofrece los mismos datos sin color.
 */
function GraficoEvolucion({ serie }) {
  const contenedorRef = useRef(null)
  const ancho = useAncho(contenedorRef)
  const [activo, setActivo] = useState(null)
  const { agrupacion, periodos } = serie

  const presentes = EMOCIONES_ORDEN.filter((emocion) => periodos.some((p) => p.conteos[emocion]))
  const { tope, marcas } = marcasEje(Math.max(1, ...periodos.map((p) => p.total)))

  const anchoUtil = Math.max(0, ancho - MARGEN.izquierda - MARGEN.derecha)
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo
  const banda = periodos.length ? anchoUtil / periodos.length : 0
  const anchoColumna = Math.max(3, Math.min(36, banda * 0.68))
  const y = (valor) => MARGEN.arriba + altoUtil - (valor / tope) * altoUtil
  // Etiquetas selectivas: como máximo ~8 en el eje X.
  const saltoEtiqueta = Math.max(1, Math.ceil(periodos.length / Math.max(2, Math.floor(anchoUtil / 78))))

  const periodoActivo = activo === null ? null : periodos[activo]
  const xActivo = activo === null ? 0 : MARGEN.izquierda + banda * activo + banda / 2

  return (
    <figure className="dash-chart">
      <ul className="dash-legend" aria-label="Emociones del gráfico">
        {presentes.map((emocion) => (
          <li key={emocion}>
            <span className="dash-legend__swatch" style={{ background: COLORES_EMOCION[emocion] }} />
            {etiquetaEmocion(emocion)}
          </li>
        ))}
      </ul>

      <div className="dash-chart__plot" ref={contenedorRef} onMouseLeave={() => setActivo(null)}>
        {ancho > 0 && (
          <svg width={ancho} height={ALTO} role="img" aria-label={`Evolución emocional por ${agrupacion}`}>
            {marcas.map((valor) => (
              <g key={valor}>
                <line
                  className="dash-chart__grid"
                  x1={MARGEN.izquierda}
                  x2={ancho - MARGEN.derecha}
                  y1={y(valor)}
                  y2={y(valor)}
                />
                <text className="dash-chart__tick" x={MARGEN.izquierda - 8} y={y(valor)} dy="0.32em" textAnchor="end">
                  {valor}
                </text>
              </g>
            ))}

            {periodos.map((periodo, index) => {
              const x = MARGEN.izquierda + banda * index + (banda - anchoColumna) / 2
              const segmentos = presentes.filter((emocion) => periodo.conteos[emocion])
              let acumulado = 0
              return (
                <g key={periodo.clave} className={activo !== null && activo !== index ? 'dash-chart__col--dim' : undefined}>
                  {segmentos.map((emocion, posicion) => {
                    const desde = acumulado
                    acumulado += periodo.conteos[emocion]
                    const yArriba = y(acumulado)
                    const alto = Math.max(1, y(desde) - yArriba - (posicion > 0 ? SEPARACION : 0))
                    const esTope = posicion === segmentos.length - 1
                    return esTope ? (
                      <path key={emocion} d={columnaRedondeada(x, yArriba, anchoColumna, alto, 4)} fill={COLORES_EMOCION[emocion]} />
                    ) : (
                      <rect key={emocion} x={x} y={yArriba} width={anchoColumna} height={alto} fill={COLORES_EMOCION[emocion]} />
                    )
                  })}
                  {index % saltoEtiqueta === 0 && (
                    <text className="dash-chart__tick" x={x + anchoColumna / 2} y={ALTO - 10} textAnchor="middle">
                      {etiquetaPeriodo(periodo.inicio, agrupacion)}
                    </text>
                  )}
                  {/* Zona de interacción más grande que la columna. */}
                  <rect
                    className="dash-chart__hit"
                    x={MARGEN.izquierda + banda * index}
                    y={MARGEN.arriba}
                    width={banda}
                    height={altoUtil}
                    tabIndex={0}
                    aria-label={`${etiquetaPeriodo(periodo.inicio, agrupacion)}: ${periodo.total} registros`}
                    onMouseEnter={() => setActivo(index)}
                    onFocus={() => setActivo(index)}
                    onBlur={() => setActivo(null)}
                  />
                </g>
              )
            })}

            <line
              className="dash-chart__baseline"
              x1={MARGEN.izquierda}
              x2={ancho - MARGEN.derecha}
              y1={y(0)}
              y2={y(0)}
            />
          </svg>
        )}

        {periodoActivo && (
          <div
            className={`dash-tooltip${xActivo > ancho / 2 ? ' dash-tooltip--left' : ''}`}
            style={{ left: xActivo }}
            role="status"
          >
            <strong>{etiquetaPeriodo(periodoActivo.inicio, agrupacion)}</strong>
            <span className="dash-tooltip__total">
              {periodoActivo.total} {periodoActivo.total === 1 ? 'registro' : 'registros'}
            </span>
            {[...presentes].reverse().filter((emocion) => periodoActivo.conteos[emocion]).map((emocion) => (
              <span key={emocion} className="dash-tooltip__row">
                <span className="dash-legend__swatch" style={{ background: COLORES_EMOCION[emocion] }} />
                {etiquetaEmocion(emocion)}
                <b>{periodoActivo.conteos[emocion]}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </figure>
  )
}

export default GraficoEvolucion
