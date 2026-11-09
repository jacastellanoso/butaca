import { useId } from 'react'

import { EMOCIONES_ORDEN } from '../estadisticas.js'
import { etiquetaEmocion, FILTROS_VACIOS } from '../formato.js'

/**
 * Filtros por emoción y rango de fechas (y tipo, si se pide).
 * valores: { emocion, desde, hasta, tipo } con fechas YYYY-MM-DD.
 */
function FiltrosHistorial({ valores, onChange, conTipo = false }) {
  const id = useId()
  const cambiar = (campo) => (event) => onChange({ ...valores, [campo]: event.target.value })
  const activos = Boolean(valores.emocion || valores.desde || valores.hasta || valores.tipo)
  const rangoInvalido = valores.desde && valores.hasta && valores.desde > valores.hasta

  return (
    <form className="dash-filters" aria-label="Filtros" onSubmit={(event) => event.preventDefault()}>
      <label className="dash-field" htmlFor={`${id}-emocion`}>
        <span>Emoción</span>
        <select id={`${id}-emocion`} value={valores.emocion} onChange={cambiar('emocion')}>
          <option value="">Todas</option>
          {EMOCIONES_ORDEN.map((emocion) => (
            <option key={emocion} value={emocion}>{etiquetaEmocion(emocion)}</option>
          ))}
        </select>
      </label>

      {conTipo && (
        <label className="dash-field" htmlFor={`${id}-tipo`}>
          <span>Tipo</span>
          <select id={`${id}-tipo`} value={valores.tipo} onChange={cambiar('tipo')}>
            <option value="">Películas y series</option>
            <option value="movie">Películas</option>
            <option value="tv">Series</option>
          </select>
        </label>
      )}

      <label className="dash-field" htmlFor={`${id}-desde`}>
        <span>Desde</span>
        <input id={`${id}-desde`} type="date" value={valores.desde} max={valores.hasta || undefined} onChange={cambiar('desde')} />
      </label>

      <label className="dash-field" htmlFor={`${id}-hasta`}>
        <span>Hasta</span>
        <input id={`${id}-hasta`} type="date" value={valores.hasta} min={valores.desde || undefined} onChange={cambiar('hasta')} />
      </label>

      <button
        className="dash-button dash-button--ghost"
        type="button"
        disabled={!activos}
        onClick={() => onChange(FILTROS_VACIOS)}
      >
        Limpiar filtros
      </button>

      {rangoInvalido && (
        <p className="dash-filters__error" role="alert">La fecha “desde” no puede ser posterior a “hasta”.</p>
      )}
    </form>
  )
}

export default FiltrosHistorial
