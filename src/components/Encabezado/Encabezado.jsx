import { useEffect, useId, useRef, useState } from 'react'

import iconoEscanear from '../../../iconoescanearme.svg'
import iconoRecomendaciones from '../../../iconomisreconocimientos.svg'
import logoButaca from '../../../logobutacaoficial.svg'
import { IconoCorazon } from '../BotonFavorito/BotonFavorito.jsx'
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

// Opciones del menú principal. `clave` coincide con la pantalla o sección activa.
const OPCIONES = [
  { clave: 'galeria', href: '#galeria', etiqueta: 'Galería', icono: <IconoGaleria /> },
  { clave: 'rostro', href: '#rostro', etiqueta: 'Escanearme', imagen: iconoEscanear },
  { clave: 'recomendaciones', href: '#recomendaciones', etiqueta: 'Mis recomendaciones', imagen: iconoRecomendaciones },
  { clave: 'dashboard', href: '#dashboard', etiqueta: 'Dashboard', icono: <IconoDashboard /> },
  { clave: 'favoritos', href: '#favoritos', etiqueta: 'Favoritos', icono: <IconoCorazon lleno /> },
]

export function AvatarPerfil({ perfil, tamano = 'md' }) {
  const [fallo, setFallo] = useState(false)
  return (
    <span className={`avatar-perfil avatar-perfil--${tamano}`} aria-hidden="true">
      {perfil?.avatar && !fallo ? (
        <img src={perfil.avatar} alt="" referrerPolicy="no-referrer" onError={() => setFallo(true)} />
      ) : (
        perfil?.inicial ?? 'B'
      )}
    </span>
  )
}

/**
 * Encabezado de las pantallas con sesión: navegación de toda la aplicación y
 * menú de usuario (cambiar perfil y cerrar sesión).
 * activa: 'galeria' | 'rostro' | 'recomendaciones' | 'dashboard' | 'favoritos' | 'historial'
 */
function Encabezado({ activa, perfil, onCerrarSesion }) {
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
    window.addEventListener('hashchange', cerrarAlNavegar)
    return () => {
      document.removeEventListener('keydown', cerrarConEscape)
      document.removeEventListener('mousedown', cerrarAfuera)
      window.removeEventListener('hashchange', cerrarAlNavegar)
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

  // Historial vive dentro del dashboard.
  const claveActiva = activa === 'historial' || activa === 'emociones' ? 'dashboard' : activa

  return (
    <header className="app-header">
      <a className="app-header__brand" href="#galeria" aria-label="Butaca: ir a la galería">
        <img src={logoButaca} alt="Butaca" />
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
            <span className="app-header__icon">{imagen ? <img src={imagen} alt="" aria-hidden="true" /> : icono}</span>
            <span>{etiqueta}</span>
          </a>
        ))}
      </nav>

      <div className="app-header__user" ref={usuarioRef}>
        <button
          className="app-header__user-button"
          type="button"
          aria-expanded={usuarioAbierto}
          aria-controls={usuarioId}
          aria-haspopup="true"
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
                <strong>{perfil?.nombre}</strong>
                {perfil?.email && <span>{perfil.email}</span>}
              </div>
            </div>
            <a className="app-header__menu-item" href="#perfiles">
              Cambiar perfil
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
