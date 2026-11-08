import { useEffect, useState } from 'react'

import { useDetalleContenido } from '../../../hooks/useDetalleContenido.js'
import { hashDeRecomendaciones } from '../../../lib/rutas.js'
import { completarGeneros } from '../../../services/detallesCatalogo.js'
import { obtenerAnimo, obtenerUltimoAnimo } from '../../../services/emociones.js'
import { obtenerRecomendaciones } from '../../../services/recomendaciones.js'
import DetalleContenido from '../../Galeria/components/DetalleContenido.jsx'
import { EMOTIONS } from '../../Rostro/emotions.js'
import EstadoPanel from '../components/EstadoPanel.jsx'
import TarjetaPelicula from '../components/TarjetaPelicula.jsx'
import { COLORES_EMOCION, EMOCIONES_ORDEN } from '../estadisticas.js'
import { etiquetaEmocion, formatearFechaHora } from '../formato.js'

const ESPERA_REINTENTO_MS = 2500

const TIPOS = [
  { valor: 'movie', etiqueta: 'Películas' },
  { valor: 'tv', etiqueta: 'Series' },
]

/**
 * Resuelve de dónde sale el ánimo:
 * - #recomendaciones/animo/:id → registro propio guardado con consentimiento.
 * - #recomendaciones/emocion/:e → emoción elegida o recién detectada, sin guardar.
 * - #recomendaciones → último ánimo guardado; si no hay, se invita a escanear.
 */
async function resolverOrigen({ emocion, animoId }) {
  if (animoId) {
    const animo = await obtenerAnimo(animoId)
    return { tipo: 'animo', animo }
  }
  if (emocion) return { tipo: 'emocion', emocion }
  const ultimo = await obtenerUltimoAnimo()
  return ultimo ? { tipo: 'ultimo', animo: ultimo } : { tipo: 'ninguno' }
}

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con recommendations-service */
function SeccionRecomendaciones({ emocion, animoId }) {
  const [tipo, setTipo] = useState('movie')
  const [estado, setEstado] = useState('loading')
  const [error, setError] = useState('')
  const [origen, setOrigen] = useState(null)
  const [resultados, setResultados] = useState([])
  const [intento, setIntento] = useState(0)
  const { seleccionado, abrir, cerrar } = useDetalleContenido()

  useEffect(() => {
    let activo = true
    let cancelarGeneros = () => {}
    setEstado('loading')
    setError('')

    ;(async () => {
      try {
        const nuevoOrigen = await resolverOrigen({ emocion, animoId })
        if (!activo) return
        setOrigen(nuevoOrigen)
        if (nuevoOrigen.tipo === 'ninguno') {
          setResultados([])
          setEstado('sin-animo')
          return
        }

        const parametros = nuevoOrigen.animo ? { animoId: nuevoOrigen.animo.id, tipo } : { emocion: nuevoOrigen.emocion, tipo }
        let respuesta
        try {
          respuesta = await obtenerRecomendaciones(parametros)
        } catch (fallo) {
          // Un 502/503 suele ser transitorio (servicios gratuitos que despiertan
          // en Render): se reintenta una sola vez antes de mostrar el error.
          if (fallo?.codigo !== 'servicio-no-disponible') throw fallo
          await new Promise((resolve) => window.setTimeout(resolve, ESPERA_REINTENTO_MS))
          if (!activo) return
          respuesta = await obtenerRecomendaciones(parametros)
        }
        if (!activo) return
        setResultados(respuesta.resultados)
        setEstado('ready')

        // Los géneros llegan después desde el detalle real del catálogo.
        cancelarGeneros = completarGeneros(respuesta.resultados, (id, extra) => {
          setResultados((lista) => lista.map((item) => (item.id === id ? { ...item, ...extra } : item)))
        })
      } catch (fallo) {
        if (!activo) return
        setError(fallo.message)
        setEstado('error')
      }
    })()

    return () => {
      activo = false
      cancelarGeneros()
    }
  }, [emocion, animoId, tipo, intento])

  const emocionActual = origen?.animo?.emocion ?? origen?.emocion ?? null

  return (
    <section className="dash-section" aria-labelledby="dash-recomendaciones-title">
      <div className="dash-section__head">
        <div>
          <h2 id="dash-recomendaciones-title">Mis recomendaciones</h2>
          <p>Películas y series reales de TMDB elegidas por el servicio de recomendaciones según tu ánimo.</p>
        </div>
        <a className="dash-button dash-button--primary" href="#rostro">Escanear de nuevo</a>
      </div>

      {emocionActual && (
        <div className="rec-mood" style={{ '--mood-color': COLORES_EMOCION[emocionActual] }}>
          <span className="rec-mood__dot" aria-hidden="true" />
          <div>
            <strong>
              Tu ánimo: {etiquetaEmocion(emocionActual)}
            </strong>
            <span>
              {origen.tipo === 'emocion'
                ? `${EMOTIONS[emocionActual].description} Esta consulta no se guarda en tu historial.`
                : `Según tu registro del ${formatearFechaHora(origen.animo.creadoEn)}.`}
            </span>
          </div>
        </div>
      )}

      <div className="rec-controls">
        <div className="rec-emotions" role="group" aria-label="Elegir otra emoción">
          {EMOCIONES_ORDEN.map((clave) => (
            <a
              key={clave}
              className="rec-chip"
              href={hashDeRecomendaciones({ emocion: clave })}
              aria-current={origen?.tipo === 'emocion' && emocionActual === clave ? 'true' : undefined}
            >
              <i style={{ background: COLORES_EMOCION[clave] }} aria-hidden="true" />
              {etiquetaEmocion(clave)}
            </a>
          ))}
        </div>

        <div className="dash-segmented" role="group" aria-label="Tipo de contenido">
          {TIPOS.map(({ valor, etiqueta }) => (
            <button key={valor} type="button" aria-pressed={tipo === valor} onClick={() => setTipo(valor)}>
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {estado === 'loading' && <EstadoPanel estado="loading" titulo="Buscando recomendaciones" filas={6} />}
      {estado === 'error' && (
        <EstadoPanel
          estado="error"
          titulo="No pudimos obtener tus recomendaciones"
          mensaje={error}
          onRetry={() => setIntento((n) => n + 1)}
        />
      )}
      {estado === 'sin-animo' && (
        <EstadoPanel
          estado="empty"
          titulo="Todavía no sabemos cómo te sentís"
          mensaje="Escaneá tu rostro o elegí una emoción arriba para recibir recomendaciones."
          accion={<a className="dash-button dash-button--primary" href="#rostro">Ir al escáner</a>}
        />
      )}
      {estado === 'ready' && resultados.length === 0 && (
        <EstadoPanel
          estado="empty"
          titulo="No hay recomendaciones disponibles"
          mensaje="El catálogo no devolvió contenidos para esta emoción. Probá con series o con otra emoción."
        />
      )}
      {estado === 'ready' && resultados.length > 0 && (
        <div className="movie-grid">
          {resultados.map((contenido, index) => (
            <TarjetaPelicula
              key={contenido.id}
              contenido={contenido}
              index={index}
              destacada={index < 5}
              onDetalle={abrir}
            />
          ))}
        </div>
      )}

      {seleccionado && <DetalleContenido contenido={seleccionado} onClose={cerrar} />}
    </section>
  )
}

export default SeccionRecomendaciones
