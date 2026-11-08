import { useEffect, useState } from 'react'

import logoButaca from '../../../logobutacaoficial.svg'
import cuadroEfecto from '../../assets/decorations/cuadroefecto.svg'
import { AvatarPerfil } from '../../components/Encabezado/Encabezado.jsx'
import '../../components/Encabezado/Encabezado.css'
import './Perfiles.css'
import { crearPerfil, enviarInvitacion, listarInvitaciones, listarPerfiles, responderInvitacion } from '../../services/grupos.js'

const PROVEEDORES = { google: 'Google', github: 'GitHub' }

/**
 * "¿Quién va a ver hoy?" — selección del perfil activo.
 *
 * Hoy existe un único perfil real por cuenta: PostgreSQL no tiene modelo
 * Perfil, así que no se inventan perfiles adicionales ni se guardan en el
 * navegador. La tarjeta "Agregar perfil" explica la dependencia de backend.
 */
function Perfiles({ perfiles, onSeleccionar, onCerrarSesion }) {
  const [lista, setLista] = useState(perfiles)
  const [invitaciones, setInvitaciones] = useState([])
  const [modo, setModo] = useState(null)
  const [valor, setValor] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState('')

  const cargar = async () => {
    try {
      const [perfilesRemotos, solicitudes] = await Promise.all([listarPerfiles(), listarInvitaciones()])
      if (Array.isArray(perfilesRemotos) && perfilesRemotos.length) setLista(perfilesRemotos)
      if (Array.isArray(solicitudes)) setInvitaciones(solicitudes)
    } catch (fallo) { setError(fallo.message) }
  }

  /* oxlint-disable-next-line react/set-state-in-effect -- carga remota inicial */
  useEffect(() => { cargar() }, [])

  const sonarEntrada = () => {
    try {
      const AudioContexto = window.AudioContext || window.webkitAudioContext
      const contexto = new AudioContexto()
      const ahora = contexto.currentTime
      ;[261.63, 329.63, 392, 523.25].forEach((frecuencia, indice) => {
        const oscilador = contexto.createOscillator()
        const ganancia = contexto.createGain()
        oscilador.type = 'sine'; oscilador.frequency.value = frecuencia
        ganancia.gain.setValueAtTime(0, ahora + indice * 0.09)
        ganancia.gain.linearRampToValueAtTime(0.08, ahora + indice * 0.09 + 0.02)
        ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + indice * 0.09 + 0.32)
        oscilador.connect(ganancia).connect(contexto.destination)
        oscilador.start(ahora + indice * 0.09); oscilador.stop(ahora + indice * 0.09 + 0.34)
      })
    } catch { /* El navegador puede bloquear audio. */ }
  }

  const seleccionar = (id) => { sonarEntrada(); window.setTimeout(() => onSeleccionar(id), 260) }

  const enviar = async (event) => {
    event.preventDefault(); setError('')
    try {
      if (modo === 'interno') await crearPerfil(valor)
      else await enviarInvitacion(valor)
      setValor(''); setModo(null); await cargar()
    } catch (fallo) { setError(fallo.message) }
  }

  const responder = async (id, aceptar) => { await responderInvitacion(id, aceptar); await cargar() }

  const handleCerrarSesion = async () => {
    setCerrando(true)
    setError('')
    try {
      await onCerrarSesion()
    } catch {
      setError('No pudimos cerrar la sesión. Intentá de nuevo.')
      setCerrando(false)
    }
  }

  return (
    <main className="perfiles-page">
      <div className="perfiles-waves" aria-hidden="true">
        <img className="perfiles-wave perfiles-wave--left" src={cuadroEfecto} alt="" />
        <img className="perfiles-wave perfiles-wave--right" src={cuadroEfecto} alt="" />
      </div>

      <img className="perfiles-logo" src={logoButaca} alt="Butaca" />

      <section className="perfiles-content" aria-labelledby="perfiles-title">
        <h1 id="perfiles-title" className="perfiles-title">
          ¿Quién va a <span>ver hoy</span>?
        </h1>

        <ul className="perfiles-grid">
          {lista.map((perfil, index) => (
            <li key={perfil.id} style={{ '--perfil-index': index }}>
              <button className="perfil-card" type="button" onClick={() => seleccionar(perfil.id)}>
                <span className="perfil-card__avatar">
                  <AvatarPerfil perfil={{ ...perfil, inicial: perfil.inicial ?? perfil.nombre?.charAt(0).toUpperCase() }} tamano="xl" />
                </span>
                <strong className="perfil-card__name">{perfil.nombre}</strong>
                <span className="perfil-card__meta">
                  {perfil.tipo === 'amigo' ? 'Grupo de amigos' : perfil.esPrincipal === false ? 'Perfil interno' : `Perfil principal${PROVEEDORES[perfil.proveedor] ? ` · ${PROVEEDORES[perfil.proveedor]}` : ''}`}
                </span>
              </button>
            </li>
          ))}

          <li style={{ '--perfil-index': lista.length }}>
            <button
              className="perfil-card perfil-card--add"
              type="button"
              onClick={() => setModo('interno')}
            >
              <span className="perfil-card__avatar perfil-card__avatar--add" aria-hidden="true">+</span>
              <strong className="perfil-card__name">Agregar perfil</strong>
              <span className="perfil-card__meta">Interno o con correo</span>
            </button>
          </li>
        </ul>

        <button className="perfiles-invite" type="button" onClick={() => setModo('correo')}>Invitar amigo por correo</button>

        {invitaciones.length > 0 && <section className="perfiles-notificaciones" aria-labelledby="invitaciones-title">
          <h2 id="invitaciones-title">Invitaciones pendientes</h2>
          {invitaciones.map((i) => <div key={i.id}><span><strong>{i.nombre}</strong> quiere compartir perfiles.</span><button type="button" onClick={() => responder(i.id, true)}>Aceptar</button><button type="button" onClick={() => responder(i.id, false)}>Rechazar</button></div>)}
        </section>}

        {modo && <div className="perfiles-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setModo(null)}>
          <form onSubmit={enviar} role="dialog" aria-modal="true" aria-labelledby="nuevo-perfil-title">
            <h2 id="nuevo-perfil-title">{modo === 'interno' ? 'Crear perfil interno' : 'Invitar al grupo'}</h2>
            <p>{modo === 'interno' ? 'Este perfil vive dentro de tu cuenta.' : 'La invitación aparecerá en la cuenta Butaca asociada.'}</p>
            <label htmlFor="perfil-valor">{modo === 'interno' ? 'Nombre del perfil' : 'Correo electrónico'}</label>
            <input id="perfil-valor" type={modo === 'correo' ? 'email' : 'text'} required minLength="2" maxLength="120" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            <div><button type="button" onClick={() => setModo(null)}>Cancelar</button><button type="submit">{modo === 'interno' ? 'Crear perfil' : 'Enviar invitación'}</button></div>
          </form>
        </div>}

        <button
          className="perfiles-logout"
          type="button"
          onClick={handleCerrarSesion}
          disabled={cerrando}
          aria-busy={cerrando}
        >
          {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
        {error && (
          <p className="perfiles-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}

export default Perfiles
