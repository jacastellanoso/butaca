import { COLORES_EMOCION } from '../estadisticas.js'
import { etiquetaEmocion, formatearFechaHora, formatearPorcentaje, ORIGEN_ETIQUETA } from '../formato.js'

/** Un registro del historial emocional con fecha y hora. */
function FilaAnimo({ animo }) {
  return (
    <li className="dash-timeline__item">
      <span className="dash-timeline__dot" style={{ background: COLORES_EMOCION[animo.emocion] }} aria-hidden="true" />
      <div className="dash-timeline__body">
        <strong>{etiquetaEmocion(animo.emocion)}</strong>
        <span>
          {ORIGEN_ETIQUETA[animo.origen]}
          {animo.confianza !== null && ` · ${formatearPorcentaje(animo.confianza)} de confianza`}
        </span>
      </div>
      <time className="dash-timeline__time" dateTime={animo.creadoEn.toISOString()}>
        {formatearFechaHora(animo.creadoEn)}
      </time>
    </li>
  )
}

export default FilaAnimo
