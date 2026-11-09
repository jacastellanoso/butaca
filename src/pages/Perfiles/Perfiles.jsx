import { useState } from 'react'

// En Perfiles el fondo es azul: variante blanca del logo (mismo SVG, solo cambia el color).
import logoButaca from '../../../logobutacablanco.svg'
import cuadroEfecto from '../../assets/decorations/cuadroefecto.svg'
import { AvatarPerfil } from '../../components/Encabezado/Encabezado.jsx'
import '../../components/Encabezado/Encabezado.css'
import './Perfiles.css'

const PROVEEDORES = { google: 'Google', github: 'GitHub' }
const VACIO = { nombre: '', apellido: '', edad: '' }

function sonarEntrada() {
  try {
    const AudioContexto = window.AudioContext || window.webkitAudioContext
    const contexto = new AudioContexto()
    const ahora = contexto.currentTime
    ;[261.63, 329.63, 392, 523.25].forEach((frecuencia, indice) => {
      const oscilador = contexto.createOscillator()
      const ganancia = contexto.createGain()
      oscilador.type = 'sine'
      oscilador.frequency.value = frecuencia
      ganancia.gain.setValueAtTime(0, ahora + indice * 0.09)
      ganancia.gain.linearRampToValueAtTime(0.08, ahora + indice * 0.09 + 0.02)
      ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + indice * 0.09 + 0.32)
      oscilador.connect(ganancia).connect(contexto.destination)
      oscilador.start(ahora + indice * 0.09)
      oscilador.stop(ahora + indice * 0.09 + 0.34)
    })
  } catch {
    // El navegador puede bloquear el audio: la selección sigue igual.
  }
}

function descripcion(perfil) {
  const partes = [perfil.esPrincipal ? 'Perfil principal' : 'Perfil']
  if (perfil.edad) partes.push(`${perfil.edad} años`)
  if (perfil.esPrincipal && PROVEEDORES[perfil.proveedor]) partes.push(PROVEEDORES[perfil.proveedor])
  return partes.join(' · ')
}

/** Formulario de perfil (crear o editar): nombre, apellido y edad. */
function FormularioPerfil({ inicial, titulo, accion, onGuardar, onCancelar }) {
  const [valores, setValores] = useState(() => ({
    nombre: inicial?.nombrePila ?? '',
    apellido: inicial?.apellido ?? '',
    edad: inicial?.edad ? String(inicial.edad) : '',
  }))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cambiar = (campo) => (event) => setValores((v) => ({ ...v, [campo]: event.target.value }))

  const enviar = async (event) => {
    event.preventDefault()
    const nombre = valores.nombre.trim()
    const apellido = valores.apellido.trim()
    const edad = Number(valores.edad)
    if (nombre.length < 2 || apellido.length < 2) return setError('Escribí nombre y apellido (al menos 2 letras cada uno).')
    if (!Number.isInteger(edad) || edad < 5 || edad > 120) return setError('Ingresá una edad válida entre 5 y 120 años.')
    setGuardando(true)
    setError('')
    try {
      await onGuardar({ nombre, apellido, edad })
    } catch (fallo) {
      setError(fallo?.message || 'No pudimos guardar el perfil. Intentá de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="perfiles-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <form onSubmit={enviar} role="dialog" aria-modal="true" aria-labelledby="perfil-form-title" noValidate>
        <h2 id="perfil-form-title">{titulo}</h2>
        <p>Cada perfil tiene sus propios favoritos, historial y recomendaciones.</p>
        <label htmlFor="perfil-nombre">Nombre</label>
        <input id="perfil-nombre" autoComplete="off" maxLength="60" value={valores.nombre} onChange={cambiar('nombre')} autoFocus />
        <label htmlFor="perfil-apellido">Apellido</label>
        <input id="perfil-apellido" autoComplete="off" maxLength="60" value={valores.apellido} onChange={cambiar('apellido')} />
        <label htmlFor="perfil-edad">Edad</label>
        <input id="perfil-edad" type="number" inputMode="numeric" min="5" max="120" value={valores.edad} onChange={cambiar('edad')} />
        {error && <p className="perfiles-form__error" role="alert">{error}</p>}
        <div>
          <button type="button" className="perfiles-modal__secundario" onClick={onCancelar}>Cancelar</button>
          <button type="submit" disabled={guardando} aria-busy={guardando}>{guardando ? 'Guardando…' : accion}</button>
        </div>
      </form>
    </div>
  )
}

/**
 * "¿Quién va a ver hoy?" — perfiles de la cuenta (auth-service, tabla Perfil).
 * Elegir un perfil cambia el perfil activo de toda la aplicación.
 */
function Perfiles({ perfiles, activoId, estado = 'ready', mensajeError, onReintentar, onSeleccionar, onCrear, onEditar, onEliminar, onCerrarSesion }) {
  const [formulario, setFormulario] = useState(null) // null | { modo: 'crear' } | { modo: 'editar', perfil }
  const [administrando, setAdministrando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState('')
  const lista = perfiles ?? []

  const seleccionar = (id) => {
    if (administrando) return
    sonarEntrada()
    window.setTimeout(() => onSeleccionar(id), 260)
  }

  const eliminar = async (perfil) => {
    if (!window.confirm(`¿Eliminar el perfil de ${perfil.nombre}? Se borrarán sus favoritos, historial y emociones.`)) return
    setError('')
    try {
      await onEliminar(perfil.id)
    } catch (fallo) {
      setError(fallo?.message || 'No pudimos eliminar el perfil.')
    }
  }

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
        <img draggable={false} className="perfiles-wave perfiles-wave--left" src={cuadroEfecto} alt="" />
        <img draggable={false} className="perfiles-wave perfiles-wave--right" src={cuadroEfecto} alt="" />
      </div>

      <img draggable={false} className="perfiles-logo" src={logoButaca} alt="Butaca" />

      <section className="perfiles-content" aria-labelledby="perfiles-title">
        <h1 id="perfiles-title" className="perfiles-title">
          ¿Quién va a <span>ver hoy</span>?
        </h1>

        {estado === 'loading' && <p className="perfiles-estado" role="status">Cargando perfiles…</p>}
        {estado === 'error' && (
          <div className="perfiles-error" role="alert">
            <p>{mensajeError || 'No pudimos cargar tus perfiles.'}</p>
            <button type="button" onClick={onReintentar}>Reintentar</button>
          </div>
        )}

        {estado === 'ready' && (
          <ul className="perfiles-grid">
            {lista.map((perfil, index) => (
              <li key={perfil.id} style={{ '--perfil-index': index }}>
                <button
                  className={`perfil-card${perfil.id === activoId ? ' perfil-card--activo' : ''}`}
                  type="button"
                  onClick={() => seleccionar(perfil.id)}
                  aria-label={`Entrar como ${perfil.nombre}`}
                  aria-current={perfil.id === activoId ? 'true' : undefined}
                  disabled={administrando}
                >
                  <span className="perfil-card__avatar">
                    <AvatarPerfil perfil={perfil} tamano="xl" />
                  </span>
                  <strong className="perfil-card__name">{perfil.nombre}</strong>
                  <span className="perfil-card__meta">{descripcion(perfil)}</span>
                </button>
                {administrando && (
                  <div className="perfil-card__acciones">
                    <button type="button" onClick={() => setFormulario({ modo: 'editar', perfil })} aria-label={`Editar ${perfil.nombre}`}>Editar</button>
                    {!perfil.esPrincipal && (
                      <button type="button" onClick={() => eliminar(perfil)} aria-label={`Eliminar ${perfil.nombre}`}>Eliminar</button>
                    )}
                  </div>
                )}
              </li>
            ))}

            {!administrando && (
              <li style={{ '--perfil-index': lista.length }}>
                <button className="perfil-card perfil-card--add" type="button" onClick={() => setFormulario({ modo: 'crear' })}>
                  <span className="perfil-card__avatar perfil-card__avatar--add" aria-hidden="true">+</span>
                  <strong className="perfil-card__name">Agregar perfil</strong>
                  <span className="perfil-card__meta">Nombre, apellido y edad</span>
                </button>
              </li>
            )}
          </ul>
        )}

        {estado === 'ready' && (
          <button className="perfiles-invite" type="button" aria-pressed={administrando} onClick={() => setAdministrando((v) => !v)}>
            {administrando ? 'Listo' : 'Administrar perfiles'}
          </button>
        )}

        {formulario && (
          <FormularioPerfil
            inicial={formulario.modo === 'editar' ? formulario.perfil : VACIO}
            titulo={formulario.modo === 'editar' ? `Editar a ${formulario.perfil.nombre}` : 'Nuevo perfil'}
            accion={formulario.modo === 'editar' ? 'Guardar cambios' : 'Crear perfil'}
            onCancelar={() => setFormulario(null)}
            onGuardar={async (datos) => {
              if (formulario.modo === 'editar') await onEditar(formulario.perfil.id, datos)
              else await onCrear(datos)
              setFormulario(null)
            }}
          />
        )}

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
