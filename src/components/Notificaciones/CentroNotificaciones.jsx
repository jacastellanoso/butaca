import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { hashDeGrupo } from '../../lib/rutas.js'
import { obtenerUltimoAnimo } from '../../services/emociones.js'
import { responderInvitacion } from '../../services/grupos.js'
import {
  elegirDelDia,
  fechaLocal,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  registrarDelDia,
  TIPOS_NOTIFICACION,
} from '../../services/notificaciones.js'
import { obtenerRecomendaciones } from '../../services/recomendaciones.js'
import './CentroNotificaciones.css'

const INTERVALO_MS = 60_000
export const EVENTO_GRUPOS = 'butaca:grupos-actualizados'

function IconoCampana() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const formatoFecha = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function destino(notificacion) {
  const { tipo, datos = {} } = notificacion
  if (['recomendacion-compartida', 'invitacion-aceptada', 'miembro-salio'].includes(tipo) && datos.grupoId) {
    return hashDeGrupo(datos.grupoId)
  }
  if (tipo === 'recomendacion-del-dia') return '#recomendaciones'
  return null
}

/**
 * Genera la recomendación del día del perfil activo si todavía no existe:
 * usa su último ánimo guardado (o una selección neutral) y la guarda en
 * auth-service, que evita duplicados por perfil y fecha.
 */
async function asegurarDelDia(resultados, perfilId) {
  const hoy = fechaLocal()
  if (resultados.some((n) => n.tipo === 'recomendacion-del-dia' && n.datos?.fecha === hoy)) return false
  const animo = await obtenerUltimoAnimo().catch(() => null)
  const { resultados: candidatos } = await obtenerRecomendaciones(
    animo ? { animoId: animo.id, tipo: 'movie' } : { emocion: 'neutral', tipo: 'movie' },
  )
  const elegido = elegirDelDia(candidatos, hoy, perfilId ?? '')
  if (!elegido) return false
  await registrarDelDia(elegido, hoy)
  return true
}

/** Campana del encabezado: invitaciones, recomendaciones compartidas y del día. */
function CentroNotificaciones({ perfilId }) {
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState('loading')
  const [lista, setLista] = useState([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [respondiendo, setRespondiendo] = useState(null)
  const [error, setError] = useState('')
  const panelId = useId()
  const raiz = useRef(null)
  const delDiaIntentado = useRef(false)

  const cargar = useCallback(async () => {
    try {
      const respuesta = await listarNotificaciones()
      setLista(respuesta.resultados)
      setNoLeidas(respuesta.noLeidas)
      setEstado('ready')
      return respuesta.resultados
    } catch {
      setEstado((actual) => (actual === 'ready' ? actual : 'error'))
      return null
    }
  }, [])

  /* oxlint-disable react/set-state-in-effect -- sincronización con auth-service */
  useEffect(() => {
    let activo = true
    ;(async () => {
      const resultados = await cargar()
      if (!activo || !resultados || delDiaIntentado.current) return
      delDiaIntentado.current = true
      try {
        if (await asegurarDelDia(resultados, perfilId)) await cargar()
      } catch {
        // Sin recomendaciones disponibles hoy: se intentará en la próxima visita.
      }
    })()
    const intervalo = window.setInterval(cargar, INTERVALO_MS)
    window.addEventListener(EVENTO_GRUPOS, cargar)
    return () => {
      activo = false
      window.clearInterval(intervalo)
      window.removeEventListener(EVENTO_GRUPOS, cargar)
    }
  }, [cargar, perfilId])
  /* oxlint-enable react/set-state-in-effect */

  useEffect(() => {
    if (!abierto) return undefined
    const cerrarConEscape = (event) => event.key === 'Escape' && setAbierto(false)
    const cerrarAfuera = (event) => !raiz.current?.contains(event.target) && setAbierto(false)
    const cerrarAlNavegar = () => setAbierto(false)
    document.addEventListener('keydown', cerrarConEscape)
    document.addEventListener('mousedown', cerrarAfuera)
    window.addEventListener('hashchange', cerrarAlNavegar)
    return () => {
      document.removeEventListener('keydown', cerrarConEscape)
      document.removeEventListener('mousedown', cerrarAfuera)
      window.removeEventListener('hashchange', cerrarAlNavegar)
    }
  }, [abierto])

  const alternar = () => {
    setAbierto((valor) => !valor)
    if (!abierto) cargar()
  }

  const leer = async (notificacion) => {
    if (notificacion.leida) return
    setLista((actual) => actual.map((n) => (n.id === notificacion.id ? { ...n, leida: true } : n)))
    setNoLeidas((n) => Math.max(0, n - 1))
    try {
      await marcarLeida(notificacion.id)
    } catch {
      cargar()
    }
  }

  const leerTodas = async () => {
    setError('')
    try {
      await marcarTodasLeidas()
      await cargar()
    } catch (fallo) {
      setError(fallo.message)
    }
  }

  const responder = async (notificacion, aceptar) => {
    setRespondiendo(notificacion.id)
    setError('')
    try {
      const { grupoId } = await responderInvitacion(notificacion.datos.invitacionId, aceptar)
      await cargar()
      window.dispatchEvent(new Event(EVENTO_GRUPOS))
      if (aceptar && grupoId) window.location.assign(hashDeGrupo(grupoId))
    } catch (fallo) {
      setError(fallo.message)
      await cargar()
    } finally {
      setRespondiendo(null)
    }
  }

  const etiquetaBoton = noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'

  return (
    <div className="notificaciones" ref={raiz}>
      <button
        className="notificaciones__boton"
        type="button"
        aria-label={etiquetaBoton}
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={alternar}
      >
        <IconoCampana />
        {noLeidas > 0 && (
          <span className="notificaciones__indicador" aria-hidden="true">{noLeidas > 99 ? '99+' : noLeidas}</span>
        )}
      </button>

      {abierto && (
        <section id={panelId} className="notificaciones__panel" aria-label="Centro de notificaciones">
          <header className="notificaciones__cabecera">
            <h2>Notificaciones</h2>
            {noLeidas > 0 && (
              <button type="button" className="notificaciones__todas" onClick={leerTodas}>Marcar todas como leídas</button>
            )}
          </header>

          {error && <p className="notificaciones__error" role="alert">{error}</p>}
          {estado === 'loading' && <p className="notificaciones__vacio" role="status">Cargando…</p>}
          {estado === 'error' && (
            <p className="notificaciones__vacio" role="alert">
              No pudimos cargar tus notificaciones. <button type="button" onClick={cargar}>Reintentar</button>
            </p>
          )}
          {estado === 'ready' && lista.length === 0 && (
            <p className="notificaciones__vacio">No tenés notificaciones por ahora.</p>
          )}

          {estado === 'ready' && lista.length > 0 && (
            <ul className="notificaciones__lista">
              {lista.map((notificacion) => {
                const enlace = destino(notificacion)
                const pendiente = notificacion.tipo === 'invitacion-grupo' && notificacion.datos?.estado === 'pendiente'
                return (
                  <li
                    key={notificacion.id}
                    className={`notificacion notificacion--${notificacion.tipo}${notificacion.leida ? '' : ' notificacion--nueva'}`}
                  >
                    {notificacion.datos?.poster && <img className="notificacion__poster" src={notificacion.datos.poster} alt="" loading="lazy" />}
                    <div className="notificacion__cuerpo">
                      <span className="notificacion__tipo">{TIPOS_NOTIFICACION[notificacion.tipo] ?? 'Aviso'}</span>
                      <strong>{notificacion.titulo}</strong>
                      <p>{notificacion.mensaje}</p>
                      <time dateTime={notificacion.creadoEn}>{formatoFecha.format(new Date(notificacion.creadoEn))}</time>

                      {pendiente && (
                        <div className="notificacion__acciones">
                          <button type="button" disabled={respondiendo === notificacion.id} onClick={() => responder(notificacion, true)}>
                            Aceptar
                          </button>
                          <button type="button" className="notificacion__rechazar" disabled={respondiendo === notificacion.id} onClick={() => responder(notificacion, false)}>
                            Rechazar
                          </button>
                        </div>
                      )}
                      {notificacion.tipo === 'invitacion-grupo' && !pendiente && notificacion.datos?.estado && (
                        <span className="notificacion__estado">Invitación {notificacion.datos.estado}</span>
                      )}
                      {enlace && (
                        <a className="notificacion__enlace" href={enlace} onClick={() => leer(notificacion)}>
                          {notificacion.tipo === 'recomendacion-del-dia' ? 'Ver recomendaciones' : 'Abrir grupo'}
                        </a>
                      )}
                    </div>
                    {!notificacion.leida && !pendiente && (
                      <button type="button" className="notificacion__leer" onClick={() => leer(notificacion)} aria-label={`Marcar como leída: ${notificacion.titulo}`}>
                        <span aria-hidden="true">✓</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

export default CentroNotificaciones
