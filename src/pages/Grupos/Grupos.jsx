import { useCallback, useEffect, useState } from 'react'

import '../Galeria/GaleriaPrincipal.css'
import '../Dashboard/Dashboard.css'
import './Grupos.css'
import Footer from '../../components/Footer/Footer.jsx'
import { EVENTO_GRUPOS } from '../../components/Notificaciones/CentroNotificaciones.jsx'
import { useFavoritos } from '../../context/favoritosContexto.js'
import { useDetalleContenido } from '../../hooks/useDetalleContenido.js'
import { hashDeGrupo } from '../../lib/rutas.js'
import {
  cancelarInvitacion,
  compartirRecomendacion,
  crearGrupo,
  eliminarGrupo,
  invitarAGrupo,
  listarGrupos,
  listarInvitaciones,
  obtenerGrupo,
  quitarMiembro,
  responderInvitacion,
} from '../../services/grupos.js'
import EstadoPanel from '../Dashboard/components/EstadoPanel.jsx'
import TarjetaPelicula from '../Dashboard/components/TarjetaPelicula.jsx'
import { formatearFechaHora } from '../Dashboard/formato.js'
import DetalleContenido from '../Galeria/components/DetalleContenido.jsx'

// Contenido compartido con la forma que usan las tarjetas y el detalle.
function contenidoDe(recomendacion) {
  return {
    id: `${recomendacion.tipo}-${recomendacion.tmdbId}`,
    tmdbId: recomendacion.tmdbId,
    tipoTmdb: recomendacion.tipo,
    tipo: recomendacion.tipo === 'movie' ? 'Película' : 'Serie',
    titulo: recomendacion.titulo,
    poster: recomendacion.poster,
    portada: recomendacion.poster,
    sinopsis: recomendacion.mensaje ? `“${recomendacion.mensaje}”` : null,
    generos: [],
    calificacion: null,
  }
}

function FormCrearGrupo({ onCreado }) {
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (event) => {
    event.preventDefault()
    if (nombre.trim().length < 2) return setError('El nombre del grupo debe tener al menos 2 caracteres.')
    setEnviando(true)
    setError('')
    try {
      const grupo = await crearGrupo({ nombre: nombre.trim() })
      setNombre('')
      onCreado(grupo)
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="grupos-form" onSubmit={enviar} noValidate>
      <label htmlFor="grupo-nombre">Nuevo grupo</label>
      <div className="grupos-form__fila">
        <input id="grupo-nombre" maxLength="60" placeholder="Ej.: Cine de los viernes" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <button className="dash-button dash-button--primary" type="submit" disabled={enviando}>Crear grupo</button>
      </div>
      {error && <p className="grupos-form__error" role="alert">{error}</p>}
    </form>
  )
}

function FormInvitar({ grupoId, onInvitado }) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const enviar = async (event) => {
    event.preventDefault()
    setEnviando(true)
    setMensaje(null)
    try {
      const invitacion = await invitarAGrupo(grupoId, email.trim())
      setEmail('')
      setMensaje({
        tipo: 'ok',
        texto: invitacion.registrado
          ? `Invitación enviada a ${invitacion.email}.`
          : `Invitación guardada: ${invitacion.email} la verá al crear su cuenta en Butaca.`,
      })
      onInvitado()
    } catch (fallo) {
      setMensaje({ tipo: 'error', texto: fallo.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="grupos-form" onSubmit={enviar} noValidate>
      <label htmlFor="grupo-invitar">Invitar por correo electrónico</label>
      <div className="grupos-form__fila">
        <input id="grupo-invitar" type="email" inputMode="email" autoComplete="email" placeholder="persona@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="dash-button dash-button--primary" type="submit" disabled={enviando || !email.trim()}>Invitar</button>
      </div>
      {mensaje && (
        <p className={mensaje.tipo === 'ok' ? 'grupos-form__ok' : 'grupos-form__error'} role={mensaje.tipo === 'ok' ? 'status' : 'alert'}>
          {mensaje.texto}
        </p>
      )}
    </form>
  )
}

/** Compartir uno de los favoritos del perfil activo con el grupo o con un integrante. */
function FormCompartir({ grupo, onCompartido }) {
  const favoritos = useFavoritos()
  const opciones = favoritos?.favoritos ?? []
  const [elegido, setElegido] = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [estado, setEstado] = useState(null)

  const enviar = async (event) => {
    event.preventDefault()
    const contenido = opciones.find((f) => f.id === elegido)
    if (!contenido) return setEstado({ tipo: 'error', texto: 'Elegí una película o serie de tus favoritos.' })
    setEstado({ tipo: 'enviando' })
    try {
      await compartirRecomendacion(grupo.id, contenido, { mensaje: mensaje.trim(), destinatarioId: destinatario })
      setElegido('')
      setMensaje('')
      setDestinatario('')
      setEstado({ tipo: 'ok', texto: `Compartiste «${contenido.titulo}».` })
      onCompartido()
    } catch (fallo) {
      setEstado({ tipo: 'error', texto: fallo.message })
    }
  }

  const otros = grupo.miembros.filter((m) => !m.esYo)

  return (
    <form className="grupos-form grupos-compartir" onSubmit={enviar} noValidate>
      <h3>Compartir una recomendación</h3>
      {opciones.length === 0 ? (
        <p className="grupos-ayuda">
          Guardá películas o series en <a href="#favoritos">tus favoritos</a> o usá «Compartir» en el detalle de cualquier título.
        </p>
      ) : (
        <>
          <label htmlFor="compartir-contenido">Película o serie</label>
          <select id="compartir-contenido" value={elegido} onChange={(e) => setElegido(e.target.value)}>
            <option value="">Elegí uno de tus favoritos…</option>
            {opciones.map((f) => <option key={f.id} value={f.id}>{f.titulo} ({f.tipo})</option>)}
          </select>
          <label htmlFor="compartir-destinatario">Para</label>
          <select id="compartir-destinatario" value={destinatario} onChange={(e) => setDestinatario(e.target.value)}>
            <option value="">Todo el grupo</option>
            {otros.map((m) => <option key={m.usuarioId} value={m.usuarioId}>{m.nombre}</option>)}
          </select>
          <label htmlFor="compartir-mensaje">Mensaje (opcional)</label>
          <input id="compartir-mensaje" maxLength="280" placeholder="¿Por qué la recomendás?" value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
          <button className="dash-button dash-button--primary" type="submit" disabled={estado?.tipo === 'enviando'}>Compartir</button>
        </>
      )}
      {estado?.texto && (
        <p className={estado.tipo === 'ok' ? 'grupos-form__ok' : 'grupos-form__error'} role={estado.tipo === 'ok' ? 'status' : 'alert'}>
          {estado.texto}
        </p>
      )}
    </form>
  )
}

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con auth-service */
function DetalleGrupo({ grupoId, onCambio }) {
  const [estado, setEstado] = useState('loading')
  const [grupo, setGrupo] = useState(null)
  const [error, setError] = useState('')
  const [accionError, setAccionError] = useState('')
  const { seleccionado, abrir, cerrar } = useDetalleContenido()

  const cargar = useCallback(async () => {
    try {
      setGrupo(await obtenerGrupo(grupoId))
      setEstado('ready')
    } catch (fallo) {
      setError(fallo.message)
      setEstado('error')
    }
  }, [grupoId])

  useEffect(() => {
    setEstado('loading')
    cargar()
    window.addEventListener(EVENTO_GRUPOS, cargar)
    return () => window.removeEventListener(EVENTO_GRUPOS, cargar)
  }, [cargar])

  const ejecutar = async (accion, despues = cargar) => {
    setAccionError('')
    try {
      await accion()
      await despues()
      onCambio()
    } catch (fallo) {
      setAccionError(fallo.message)
    }
  }

  if (estado === 'loading') return <EstadoPanel estado="loading" titulo="Cargando grupo" filas={3} />
  if (estado === 'error') {
    return <EstadoPanel estado="error" titulo="No pudimos abrir el grupo" mensaje={error} onRetry={cargar} accion={<a className="dash-button dash-button--ghost" href="#grupos">Volver a mis grupos</a>} />
  }

  const esPropietario = grupo.rol === 'propietario'
  const salirOEliminar = esPropietario
    ? () => window.confirm(`¿Eliminar el grupo «${grupo.nombre}» para todos sus integrantes?`) &&
      ejecutar(() => eliminarGrupo(grupo.id), () => { window.location.hash = '#grupos' })
    : () => window.confirm(`¿Salir del grupo «${grupo.nombre}»?`) &&
      ejecutar(() => quitarMiembro(grupo.id, grupo.miembros.find((m) => m.esYo).usuarioId), () => { window.location.hash = '#grupos' })

  return (
    <div className="grupo-detalle">
      <header className="grupo-detalle__cabecera">
        <div>
          <h2 id="grupo-titulo">{grupo.nombre}</h2>
          {grupo.descripcion && <p>{grupo.descripcion}</p>}
          <span className="grupos-chip">{esPropietario ? 'Creaste este grupo' : 'Integrante'}</span>
        </div>
        <button className="dash-button dash-button--ghost grupos-peligro" type="button" onClick={salirOEliminar}>
          {esPropietario ? 'Eliminar grupo' : 'Salir del grupo'}
        </button>
      </header>
      {accionError && <p className="grupos-form__error" role="alert">{accionError}</p>}

      <div className="grupo-detalle__columnas">
        <section className="grupos-tarjeta" aria-labelledby="grupo-miembros">
          <h3 id="grupo-miembros">Integrantes ({grupo.miembros.length})</h3>
          <ul className="grupos-miembros">
            {grupo.miembros.map((m) => (
              <li key={m.usuarioId}>
                <span className="grupos-miembros__avatar" aria-hidden="true">{m.nombre.charAt(0).toUpperCase()}</span>
                <span className="grupos-miembros__datos">
                  <strong>{m.nombre}{m.esYo ? ' (vos)' : ''}</strong>
                  <small>{m.rol === 'propietario' ? 'Creador del grupo' : m.email ?? 'Integrante'}</small>
                </span>
                {esPropietario && m.rol !== 'propietario' && (
                  <button type="button" className="grupos-quitar" onClick={() => window.confirm(`¿Quitar a ${m.nombre} del grupo?`) && ejecutar(() => quitarMiembro(grupo.id, m.usuarioId))} aria-label={`Quitar a ${m.nombre}`}>
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>

          {grupo.invitaciones.length > 0 && (
            <>
              <h4>Invitaciones pendientes</h4>
              <ul className="grupos-pendientes">
                {grupo.invitaciones.map((i) => (
                  <li key={i.id}>
                    <span>{i.email}</span>
                    {i.puedoCancelar && (
                      <button type="button" className="grupos-quitar" onClick={() => ejecutar(() => cancelarInvitacion(grupo.id, i.id))} aria-label={`Cancelar invitación a ${i.email}`}>
                        Cancelar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <FormInvitar grupoId={grupo.id} onInvitado={cargar} />
        </section>

        <section className="grupos-tarjeta" aria-labelledby="grupo-recomendaciones">
          <h3 id="grupo-recomendaciones">Recomendaciones compartidas</h3>
          <FormCompartir grupo={grupo} onCompartido={cargar} />
          {grupo.recomendaciones.length === 0 ? (
            <p className="grupos-ayuda">Todavía nadie compartió nada en este grupo.</p>
          ) : (
            <div className="movie-grid grupos-recomendaciones">
              {grupo.recomendaciones.map((r, index) => (
                <TarjetaPelicula
                  key={r.id}
                  index={index}
                  contenido={contenidoDe(r)}
                  onDetalle={abrir}
                  pie={(
                    <p className="grupos-autor">
                      Compartida por <strong>{r.esMia ? `${r.autorNombre} (vos)` : r.autorNombre}</strong>
                      {r.destinatarioNombre && <> para <strong>{r.destinatarioNombre}</strong></>}
                      <br />
                      <time dateTime={r.creadoEn}>{formatearFechaHora(new Date(r.creadoEn))}</time>
                    </p>
                  )}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {seleccionado && <DetalleContenido contenido={seleccionado} onClose={cerrar} />}
    </div>
  )
}

/**
 * Invitaciones pendientes dirigidas a esta cuenta (GET /api/invitaciones).
 * La campana también las muestra, pero solo entre las últimas notificaciones:
 * aquí siempre se pueden aceptar o rechazar, aunque el aviso ya no esté a la vista.
 */
function InvitacionesRecibidas({ invitaciones, onRespondida }) {
  const [respondiendo, setRespondiendo] = useState(null)
  const [error, setError] = useState('')

  if (invitaciones.length === 0) return null

  const responder = async (invitacion, aceptar) => {
    setRespondiendo(invitacion.id)
    setError('')
    try {
      const { grupoId } = await responderInvitacion(invitacion.id, aceptar)
      // La campana y la lista de grupos se actualizan con el mismo evento.
      window.dispatchEvent(new Event(EVENTO_GRUPOS))
      onRespondida()
      if (aceptar && grupoId) window.location.assign(hashDeGrupo(grupoId))
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setRespondiendo(null)
    }
  }

  return (
    <section className="grupos-invitaciones" aria-labelledby="grupos-invitaciones-titulo">
      <h3 id="grupos-invitaciones-titulo">Invitaciones recibidas</h3>
      <ul>
        {invitaciones.map((i) => (
          <li key={i.id}>
            <p>
              <strong>{i.remitente}</strong> te invitó a <strong>«{i.grupoNombre}»</strong>
              <small><time dateTime={i.creadoEn}>{formatearFechaHora(new Date(i.creadoEn))}</time></small>
            </p>
            <div className="grupos-invitaciones__acciones">
              <button
                type="button"
                className="dash-button dash-button--primary"
                disabled={respondiendo === i.id}
                aria-label={`Aceptar invitación a ${i.grupoNombre}`}
                onClick={() => responder(i, true)}
              >
                Aceptar
              </button>
              <button
                type="button"
                className="dash-button"
                disabled={respondiendo === i.id}
                aria-label={`Rechazar invitación a ${i.grupoNombre}`}
                onClick={() => responder(i, false)}
              >
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="grupos-form__error" role="alert">{error}</p>}
    </section>
  )
}

/** Grupos de la cuenta: crear, invitar, gestionar integrantes y compartir recomendaciones. */
function Grupos({ encabezado, grupoId }) {
  const [estado, setEstado] = useState('loading')
  const [grupos, setGrupos] = useState([])
  const [error, setError] = useState('')
  const [invitaciones, setInvitaciones] = useState([])

  const cargar = useCallback(async () => {
    // Las invitaciones no bloquean la lista de grupos si fallan.
    listarInvitaciones()
      .then((lista) => setInvitaciones(Array.isArray(lista) ? lista : []))
      .catch(() => {})
    try {
      setGrupos(await listarGrupos())
      setEstado('ready')
    } catch (fallo) {
      setError(fallo.message)
      setEstado('error')
    }
  }, [])

  useEffect(() => {
    cargar()
    window.addEventListener(EVENTO_GRUPOS, cargar)
    return () => window.removeEventListener(EVENTO_GRUPOS, cargar)
  }, [cargar])

  return (
    <div className="dashboard-page">
      {encabezado}
      <main className="dashboard-main">
        <header className="dashboard-hero">
          <p className="dashboard-hero__eyebrow">Ver en compañía</p>
          <h1>Mis <span>grupos</span></h1>
          <p className="dashboard-hero__lead">Invitá a otras personas por correo y compartan lo que vale la pena ver.</p>
        </header>

        <div className="grupos-layout">
          <aside className="dash-section grupos-lista" aria-labelledby="grupos-lista-titulo">
            <h2 id="grupos-lista-titulo">Tus grupos</h2>
            <InvitacionesRecibidas invitaciones={invitaciones} onRespondida={cargar} />
            <FormCrearGrupo onCreado={(grupo) => { cargar(); window.location.hash = hashDeGrupo(grupo.id) }} />
            {estado === 'loading' && <EstadoPanel estado="loading" titulo="Cargando grupos" filas={2} />}
            {estado === 'error' && <EstadoPanel estado="error" titulo="No pudimos cargar tus grupos" mensaje={error} onRetry={cargar} />}
            {estado === 'ready' && grupos.length === 0 && (
              <p className="grupos-ayuda">Todavía no formás parte de ningún grupo. Creá uno o aceptá una invitación.</p>
            )}
            {estado === 'ready' && grupos.length > 0 && (
              <ul className="grupos-items">
                {grupos.map((g) => (
                  <li key={g.id}>
                    <a href={hashDeGrupo(g.id)} aria-current={g.id === grupoId ? 'page' : undefined}>
                      <strong>{g.nombre}</strong>
                      <small>{g.miembros} {g.miembros === 1 ? 'integrante' : 'integrantes'} · {g.rol === 'propietario' ? 'Creador' : 'Integrante'}</small>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="dash-section grupos-principal" aria-labelledby={grupoId ? 'grupo-titulo' : undefined} aria-label={grupoId ? undefined : 'Detalle del grupo'}>
            {grupoId ? (
              <DetalleGrupo key={grupoId} grupoId={grupoId} onCambio={cargar} />
            ) : (
              <EstadoPanel estado="empty" titulo="Elegí un grupo" mensaje="Seleccioná un grupo para ver sus integrantes y recomendaciones, o creá uno nuevo." />
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Grupos
