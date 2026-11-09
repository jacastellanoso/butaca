import { useEffect, useMemo, useState } from 'react'

import { DESTACADAS_POR_ANIMO, listarHistorialRecomendaciones } from '../../../services/biblioteca.js'
import { listarAnimos } from '../../../services/emociones.js'
import EstadoPanel from '../components/EstadoPanel.jsx'
import FilaAnimo from '../components/FilaAnimo.jsx'
import FiltrosHistorial from '../components/FiltrosHistorial.jsx'
import Paginacion from '../components/Paginacion.jsx'
import { COLORES_EMOCION } from '../estadisticas.js'
import { etiquetaEmocion, FILTROS_VACIOS, formatearFechaHora } from '../formato.js'

/** Carga una página de un listado paginado y la recarga cuando cambian filtros o página. */
/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con los microservicios */
function useListado(cargar, filtros, pagina) {
  const [estado, setEstado] = useState({ estado: 'loading', datos: null, error: '' })
  const [intento, setIntento] = useState(0)
  const rangoInvalido = filtros.desde && filtros.hasta && filtros.desde > filtros.hasta

  useEffect(() => {
    if (rangoInvalido) return undefined
    let activo = true
    setEstado((actual) => ({ ...actual, estado: 'loading', error: '' }))
    cargar({ ...filtros, pagina, orden: 'desc' })
      .then((datos) => activo && setEstado({ estado: 'ready', datos, error: '' }))
      .catch((fallo) => activo && setEstado({ estado: 'error', datos: null, error: fallo.message }))
    return () => {
      activo = false
    }
  }, [cargar, filtros, pagina, rangoInvalido, intento])

  return { ...estado, reintentar: () => setIntento((n) => n + 1) }
}

function SeccionHistorial() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [paginaAnimos, setPaginaAnimos] = useState(1)
  const [paginaRecomendaciones, setPaginaRecomendaciones] = useState(1)

  // El tipo solo aplica a recomendaciones; las emociones no lo tienen.
  const { emocion, desde, hasta } = filtros
  const filtrosAnimos = useMemo(() => ({ emocion, desde, hasta }), [emocion, desde, hasta])
  const animos = useListado(listarAnimos, filtrosAnimos, paginaAnimos)
  const recomendaciones = useListado(listarHistorialRecomendaciones, filtros, paginaRecomendaciones)

  const cambiarFiltros = (nuevos) => {
    setFiltros(nuevos)
    setPaginaAnimos(1)
    setPaginaRecomendaciones(1)
  }

  return (
    <section className="dash-section" aria-labelledby="dash-historial-title">
      <div className="dash-section__head">
        <div>
          <h2 id="dash-historial-title">Historial</h2>
          <p>Tus emociones registradas y las recomendaciones que Butaca te mostró, con su fecha.</p>
        </div>
      </div>

      <FiltrosHistorial valores={filtros} onChange={cambiarFiltros} conTipo />

      <div className="dash-grid dash-grid--history">
        <article className="dash-card">
          <header className="dash-card__head">
            <h3>Emociones registradas</h3>
          </header>
          {animos.estado === 'loading' && <EstadoPanel estado="loading" titulo="Cargando emociones" />}
          {animos.estado === 'error' && (
            <EstadoPanel estado="error" titulo="No pudimos cargar tus emociones" mensaje={animos.error} onRetry={animos.reintentar} />
          )}
          {animos.estado === 'ready' && animos.datos.resultados.length === 0 && (
            <EstadoPanel estado="empty" titulo="Sin emociones registradas" mensaje="No hay registros para estos filtros." />
          )}
          {animos.estado === 'ready' && animos.datos.resultados.length > 0 && (
            <>
              <ol className="dash-timeline">
                {animos.datos.resultados.map((animo) => <FilaAnimo key={animo.id} animo={animo} />)}
              </ol>
              <Paginacion paginacion={animos.datos.paginacion} onChange={setPaginaAnimos} etiqueta="Páginas de emociones" />
            </>
          )}
        </article>

        <article className="dash-card">
          <header className="dash-card__head">
            <h3>Recomendaciones recibidas</h3>
          </header>
          <p className="dash-card__hint">
            Se guardan las {DESTACADAS_POR_ANIMO} recomendaciones destacadas de cada emoción que autorizaste
            guardar. Que aparezcan aquí no significa que las hayas visto.
          </p>
          {recomendaciones.estado === 'loading' && <EstadoPanel estado="loading" titulo="Cargando recomendaciones" />}
          {recomendaciones.estado === 'error' && (
            <EstadoPanel
              estado="error"
              titulo="No pudimos cargar el historial de recomendaciones"
              mensaje={recomendaciones.error}
              onRetry={recomendaciones.reintentar}
            />
          )}
          {recomendaciones.estado === 'ready' && recomendaciones.datos.resultados.length === 0 && (
            <EstadoPanel
              estado="empty"
              titulo="Sin recomendaciones guardadas"
              mensaje="Escaneá tu rostro y autorizá guardar el resultado para empezar tu historial."
            />
          )}
          {recomendaciones.estado === 'ready' && recomendaciones.datos.resultados.length > 0 && (
            <>
              <ol className="history-list">
                {recomendaciones.datos.resultados.map((item) => (
                  <li key={item.id} className="history-list__item">
                    {item.poster ? (
                      <img draggable={false} src={item.poster} alt="" loading="lazy" />
                    ) : (
                      <span className="history-list__placeholder" aria-hidden="true">B</span>
                    )}
                    <div className="history-list__body">
                      <strong>{item.titulo}</strong>
                      <span>
                        {item.tipo}
                        {item.calificacion !== null && ` · ★ ${item.calificacion.toFixed(1)}`}
                      </span>
                      <span className="history-list__emotion">
                        <i style={{ background: COLORES_EMOCION[item.emocion] }} aria-hidden="true" />
                        Recomendada por {etiquetaEmocion(item.emocion).toLowerCase()}
                      </span>
                    </div>
                    <time dateTime={item.creadoEn.toISOString()}>{formatearFechaHora(item.creadoEn)}</time>
                  </li>
                ))}
              </ol>
              <Paginacion
                paginacion={recomendaciones.datos.paginacion}
                onChange={setPaginaRecomendaciones}
                etiqueta="Páginas de recomendaciones"
              />
            </>
          )}
        </article>
      </div>
    </section>
  )
}

export default SeccionHistorial
