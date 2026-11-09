import { useCallback, useEffect, useMemo, useState } from 'react'

import { listarAnimosParaEstadisticas } from '../../../services/emociones.js'
import EstadoPanel from '../components/EstadoPanel.jsx'
import FilaAnimo from '../components/FilaAnimo.jsx'
import FiltrosHistorial from '../components/FiltrosHistorial.jsx'
import GraficoDistribucion from '../components/GraficoDistribucion.jsx'
import GraficoEvolucion from '../components/GraficoEvolucion.jsx'
import {
  COLORES_EMOCION,
  confianzaPromedio,
  distribucion,
  EMOCIONES_ORDEN,
  emocionMasFrecuente,
  serieTemporal,
} from '../estadisticas.js'
import {
  etiquetaEmocion,
  etiquetaPeriodo,
  formatearFechaHora,
  FILTROS_VACIOS,
  formatearPorcentaje,
} from '../formato.js'

const MAXIMO_REGISTROS = 500

function TablaEvolucion({ serie }) {
  const presentes = EMOCIONES_ORDEN.filter((emocion) => serie.periodos.some((p) => p.conteos[emocion]))
  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <caption className="visually-hidden">Registros por periodo y emoción</caption>
        <thead>
          <tr>
            <th scope="col">Periodo</th>
            {presentes.map((emocion) => <th key={emocion} scope="col">{etiquetaEmocion(emocion)}</th>)}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {serie.periodos.filter((p) => p.total > 0).map((periodo) => (
            <tr key={periodo.clave}>
              <th scope="row">{etiquetaPeriodo(periodo.inicio, serie.agrupacion)}</th>
              {presentes.map((emocion) => <td key={emocion}>{periodo.conteos[emocion] ?? 0}</td>)}
              <td><b>{periodo.total}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con emotions-service */
function SeccionEmociones() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [estado, setEstado] = useState('loading')
  const [error, setError] = useState('')
  const [datos, setDatos] = useState({ registros: [], total: 0 })
  const [verTabla, setVerTabla] = useState(false)

  const rangoInvalido = filtros.desde && filtros.hasta && filtros.desde > filtros.hasta

  const cargar = useCallback(async (activo = () => true) => {
    setEstado('loading')
    try {
      const resultado = await listarAnimosParaEstadisticas(filtros, MAXIMO_REGISTROS)
      if (!activo()) return
      setDatos(resultado)
      setEstado('ready')
    } catch (fallo) {
      if (!activo()) return
      setError(fallo.message)
      setEstado('error')
    }
  }, [filtros])

  useEffect(() => {
    if (rangoInvalido) return undefined
    let activo = true
    cargar(() => activo)
    return () => {
      activo = false
    }
  }, [cargar, rangoInvalido])

  const { registros, total } = datos
  const resumen = useMemo(() => ({
    distribucion: distribucion(registros),
    masFrecuente: emocionMasFrecuente(registros),
    confianza: confianzaPromedio(registros),
    serie: serieTemporal(registros),
  }), [registros])

  const filtrando = Boolean(filtros.emocion || filtros.desde || filtros.hasta)

  return (
    <section className="dash-section" aria-labelledby="dash-emociones-title">
      <div className="dash-section__head">
        <div>
          <h2 id="dash-emociones-title">Mis emociones</h2>
          <p>Resultados que autorizaste guardar desde el escáner. Solo vos podés verlos.</p>
        </div>
        <a className="dash-button dash-button--primary" href="/rostro">Registrar cómo me siento</a>
      </div>

      <FiltrosHistorial valores={filtros} onChange={setFiltros} />

      {estado === 'loading' && <EstadoPanel estado="loading" titulo="Cargando tu historial emocional" filas={4} />}
      {estado === 'error' && (
        <EstadoPanel estado="error" titulo="No pudimos cargar tus emociones" mensaje={error} onRetry={() => cargar()} />
      )}
      {estado === 'ready' && registros.length === 0 && (
        <EstadoPanel
          estado="empty"
          titulo={filtrando ? 'No hay registros con estos filtros' : 'Todavía no guardaste emociones'}
          mensaje={
            filtrando
              ? 'Probá con otra emoción o un rango de fechas más amplio.'
              : 'Escaneá tu rostro y autorizá guardar el resultado para ver aquí cómo cambia tu ánimo.'
          }
          accion={!filtrando && <a className="dash-button dash-button--primary" href="/rostro">Ir al escáner</a>}
        />
      )}

      {estado === 'ready' && registros.length > 0 && (
        <>
          <div className="dash-kpis">
            <article className="dash-kpi">
              <span>Registros</span>
              <strong>{total}</strong>
              <small>{filtrando ? 'con los filtros aplicados' : 'en tu historial'}</small>
            </article>
            <article className="dash-kpi dash-kpi--highlight">
              <span>Emoción más frecuente</span>
              <strong>
                <i style={{ background: COLORES_EMOCION[resumen.masFrecuente.emocion] }} aria-hidden="true" />
                {etiquetaEmocion(resumen.masFrecuente.emocion)}
              </strong>
              <small>
                {resumen.masFrecuente.cantidad} de {registros.length} ({formatearPorcentaje(resumen.masFrecuente.porcentaje)})
              </small>
            </article>
            <article className="dash-kpi">
              <span>Último registro</span>
              <strong className="dash-kpi__text">{etiquetaEmocion(registros[0].emocion)}</strong>
              <small>{formatearFechaHora(registros[0].creadoEn)}</small>
            </article>
            <article className="dash-kpi">
              <span>Confianza promedio</span>
              <strong>{resumen.confianza === null ? '—' : formatearPorcentaje(resumen.confianza)}</strong>
              <small>de las detecciones con face-api.js</small>
            </article>
          </div>

          {total > registros.length && (
            <p className="dash-note">
              Los gráficos usan tus {registros.length} registros más recientes de {total}. Filtrá por fechas para ver otro periodo.
            </p>
          )}

          <div className="dash-grid">
            <article className="dash-card dash-card--wide">
              <header className="dash-card__head">
                <h3>Evolución emocional</h3>
                <button
                  className="dash-link-button"
                  type="button"
                  aria-pressed={verTabla}
                  onClick={() => setVerTabla((valor) => !valor)}
                >
                  {verTabla ? 'Ver gráfico' : 'Ver como tabla'}
                </button>
              </header>
              {verTabla ? <TablaEvolucion serie={resumen.serie} /> : <GraficoEvolucion serie={resumen.serie} />}
            </article>

            <article className="dash-card">
              <header className="dash-card__head">
                <h3>Distribución</h3>
              </header>
              <GraficoDistribucion datos={resumen.distribucion} />
            </article>

            <article className="dash-card">
              <header className="dash-card__head">
                <h3>Registros recientes</h3>
                <a className="dash-link-button" href="/historial">Ver historial</a>
              </header>
              <ol className="dash-timeline">
                {registros.slice(0, 6).map((animo) => <FilaAnimo key={animo.id} animo={animo} />)}
              </ol>
            </article>
          </div>
        </>
      )}
    </section>
  )
}

export default SeccionEmociones
