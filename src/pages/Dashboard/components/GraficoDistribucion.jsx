import { COLORES_EMOCION } from '../estadisticas.js'
import { etiquetaEmocion, formatearPorcentaje } from '../formato.js'

/**
 * Barras horizontales con etiqueta y valor visibles en cada fila
 * (no depende solo del color para identificar la emoción).
 */
function GraficoDistribucion({ datos }) {
  const maximo = Math.max(1, ...datos.map((d) => d.cantidad))

  return (
    <ul className="dash-bars" aria-label="Distribución de emociones">
      {datos.map(({ emocion, cantidad, porcentaje }, index) => (
        <li key={emocion} className="dash-bars__row" style={{ '--bar-index': index }}>
          <span className="dash-bars__label">{etiquetaEmocion(emocion)}</span>
          <span className="dash-bars__track" aria-hidden="true">
            <span
              className="dash-bars__fill"
              style={{ width: `${(cantidad / maximo) * 100}%`, background: COLORES_EMOCION[emocion] }}
            />
          </span>
          <span className="dash-bars__value">
            {cantidad} <small>({formatearPorcentaje(porcentaje)})</small>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default GraficoDistribucion
