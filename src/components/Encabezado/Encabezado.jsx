import { useEffect, useId, useRef, useState } from 'react'

import iconoEscanear from '../../../iconoescanearme.svg'
import iconoRecomendaciones from '../../../iconomisreconocimientos.svg'
import logoButaca from '../../../logobutacaoficial.svg'
import { EVENTO_NAVEGACION } from '../../lib/rutas.js'
import { IconoCorazon } from '../BotonFavorito/BotonFavorito.jsx'
import CentroNotificaciones from '../Notificaciones/CentroNotificaciones.jsx'
import './Encabezado.css'

function IconoGaleria() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </svg>
  )
}

function IconoDashboard() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 20V11M10 20V4M16 20v-6M22 20H2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function IconoGrupos() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="9" cy="8" r="3.4" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M2.8 19.5c.5-3.4 3.1-5.6 6.2-5.6s5.7 2.2 6.2 5.6Z" />
      <path d="M15.6 14.2c2.6-.3 5 1.4 5.6 4.3h-4.4" />
    </svg>
  )
}

// Opciones del menú principal. `clave` coincide con la pantalla o sección activa.
const OPCIONES = [
  { clave: 'galeria', href: '/galeria', etiqueta: 'Galería', icono: <IconoGaleria /> },
  { clave: 'rostro', href: '/rostro', etiqueta: 'Escanearme', imagen: iconoEscanear },
  { clave: 'recomendaciones', href: '/recomendaciones', etiqueta: 'Mis recomendaciones', imagen: iconoRecomendaciones },
  { clave: 'grupos', href: '/grupos', etiqueta: 'Grupos', icono: <IconoGrupos /> },
  { clave: 'dashboard', href: '/dashboard', etiqueta: 'Dashboard', icono: <IconoDashboard /> },
  { clave: 'favoritos', href: '/favoritos', etiqueta: 'Favoritos', icono: <IconoCorazon lleno /> },
]

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
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [usuarioAbierto, setUsuarioAbierto] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState('')
  const menuId = useId()
  const usuarioId = useId()
  const usuarioRef = useRef(null)

  useEffect(() => {
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuAbierto(false)
        setUsuarioAbierto(false)
      }
    }
    const cerrarAfuera = (event) => {
      if (!usuarioRef.current?.contains(event.target)) setUsuarioAbierto(false)
    }
    const cerrarAlNavegar = () => {
      setMenuAbierto(false)
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

      <button
        className="app-header__toggle"
        type="button"
        aria-expanded={menuAbierto}
        aria-controls={menuId}
        onClick={() => setMenuAbierto((abierto) => !abierto)}
      >
        <span className="app-header__toggle-bars" aria-hidden="true" />
        <span className="visually-hidden">{menuAbierto ? 'Cerrar menú' : 'Abrir menú'}</span>
      </button>

      <nav
        id={menuId}
        className={`app-header__nav${menuAbierto ? ' app-header__nav--abierta' : ''}`}
        aria-label="Navegación principal"
      >
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
