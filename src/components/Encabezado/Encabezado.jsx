import { useEffect, useId, useRef, useState } from 'react'

import logoButaca from '../../../logobutacaoficial.svg'
import { EVENTO_NAVEGACION } from '../../lib/rutas.js'
import CentroNotificaciones from '../Notificaciones/CentroNotificaciones.jsx'
import { OPCIONES } from './opcionesNavegacion.jsx'
import './Encabezado.css'

export function AvatarPerfil({ perfil, tamano = 'md' }) {
  const [fallo, setFallo] = useState(false)
  return (
    <span className={`avatar-perfil avatar-perfil--${tamano}`} aria-hidden="true">
      {perfil?.avatar && !fallo ? (
        <img draggable={false} src={perfil.avatar} alt="" referrerPolicy="no-referrer" onError={() => setFallo(true)} />
      ) : (
        perfil?.inicial ?? 'B'
      )}
    </span>
  )
}

/**
 * Encabezado de las pantallas con sesión: navegación de toda la aplicación y
 * menú de usuario (perfil activo, cambio rápido de perfil y cerrar sesión) y
 * centro de notificaciones.
 * activa: 'galeria' | 'rostro' | 'recomendaciones' | 'grupos' | 'dashboard' | 'favoritos' | 'historial'
 */
function Encabezado({ activa, perfil, cuenta, perfiles = [], onCambiarPerfil, onCerrarSesion }) {
  const [usuarioAbierto, setUsuarioAbierto] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState('')
  const usuarioId = useId()
  const usuarioRef = useRef(null)

  useEffect(() => {
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') {
        setUsuarioAbierto(false)
      }
    }
    const cerrarAfuera = (event) => {
      if (!usuarioRef.current?.contains(event.target)) setUsuarioAbierto(false)
    }
    const cerrarAlNavegar = () => {
      setUsuarioAbierto(false)
    }
    document.addEventListener('keydown', cerrarConEscape)
    document.addEventListener('mousedown', cerrarAfuera)
    window.addEventListener(EVENTO_NAVEGACION, cerrarAlNavegar)
    return () => {
      document.removeEventListener('keydown', cerrarConEscape)
      document.removeEventListener('mousedown', cerrarAfuera)
      window.removeEventListener(EVENTO_NAVEGACION, cerrarAlNavegar)
    }
  }, [])

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

  const otrosPerfiles = perfiles.filter((otro) => otro.id !== perfil?.id)

  // Historial vive dentro del dashboard.
  const claveActiva = activa === 'historial' || activa === 'emociones' ? 'dashboard' : activa

  return (
    <header className="app-header">
      <a className="app-header__brand" draggable={false} href="/galeria" aria-label="Butaca: ir a la galería">
        <img draggable={false} src={logoButaca} alt="Butaca" />
      </a>

      {/* En pantallas medianas y chicas es una fila horizontal desplazable debajo
          del logo (sin menú desplegable que tape la página). */}
      <nav className="app-header__nav" aria-label="Navegación principal">
        {OPCIONES.map(({ clave, href, etiqueta, icono, imagen }) => (
          <a
            key={clave}
            className={`app-header__link app-header__link--${clave}`}
            href={href}
            aria-current={claveActiva === clave ? 'page' : undefined}
          >
            <span className="app-header__icon">{imagen ? <img draggable={false} src={imagen} alt="" aria-hidden="true" /> : icono}</span>
            <span>{etiqueta}</span>
          </a>
        ))}
      </nav>

      <CentroNotificaciones key={perfil?.id ?? 'cuenta'} perfilId={perfil?.id} />

      <div className="app-header__user" ref={usuarioRef}>
        <button
          className="app-header__user-button"
          type="button"
          aria-expanded={usuarioAbierto}
          aria-controls={usuarioId}
          aria-haspopup="true"
          aria-label={`Menú de ${perfil?.nombre ?? 'mi cuenta'}`}
          onClick={() => setUsuarioAbierto((abierto) => !abierto)}
        >
          <AvatarPerfil perfil={perfil} />
          <span className="app-header__user-name">{perfil?.nombre ?? 'Mi cuenta'}</span>
          <span className="app-header__chevron" aria-hidden="true" />
        </button>

        {usuarioAbierto && (
          <div id={usuarioId} className="app-header__menu">
            <div className="app-header__menu-profile">
              <AvatarPerfil perfil={perfil} tamano="lg" />
              <div>
                <span className="app-header__menu-etiqueta">Perfil activo</span>
                <strong data-testid="perfil-activo">{perfil?.nombre}</strong>
                <span>{perfil?.edad ? `${perfil.edad} años` : perfil?.esPrincipal ? 'Perfil principal' : 'Perfil'}</span>
              </div>
            </div>
            {/* La cuenta (quien inició sesión) es distinta del perfil que está mirando. */}
            {cuenta && (
              <p className="app-header__menu-cuenta" data-testid="cuenta-sesion">
                Cuenta: <strong>{cuenta.nombre}</strong>
                {cuenta.email && <span>{cuenta.email}</span>}
              </p>
            )}
            {otrosPerfiles.length > 0 && onCambiarPerfil && (
              <div className="app-header__menu-perfiles" role="group" aria-label="Cambiar de perfil">
                <span className="app-header__menu-titulo">Cambiar a</span>
                {otrosPerfiles.map((otro) => (
                  <button
                    key={otro.id}
                    className="app-header__menu-item app-header__menu-perfil"
                    type="button"
                    onClick={() => {
                      setUsuarioAbierto(false)
                      onCambiarPerfil(otro.id)
                    }}
                  >
                    <AvatarPerfil perfil={otro} />
                    <span>{otro.nombre}</span>
                  </button>
                ))}
              </div>
            )}
            <a className="app-header__menu-item" href="/perfiles">
              {otrosPerfiles.length > 0 ? 'Administrar perfiles' : 'Cambiar perfil'}
            </a>
            <button
              className="app-header__menu-item app-header__menu-item--logout"
              type="button"
              onClick={handleCerrarSesion}
              disabled={cerrando}
              aria-busy={cerrando}
            >
              {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
            {error && (
              <p className="app-header__menu-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default Encabezado
