import { useState } from 'react'

import logoButaca from '../../../logobutacaoficial.svg'
import cuadroEfecto from '../../assets/decorations/cuadroefecto.svg'
import { AvatarPerfil } from '../../components/Encabezado/Encabezado.jsx'
import '../../components/Encabezado/Encabezado.css'
import './Perfiles.css'

const PROVEEDORES = { google: 'Google', github: 'GitHub' }

/**
 * "¿Quién va a ver hoy?" — selección del perfil activo.
 *
 * Hoy existe un único perfil real por cuenta: PostgreSQL no tiene modelo
 * Perfil, así que no se inventan perfiles adicionales ni se guardan en el
 * navegador. La tarjeta "Agregar perfil" explica la dependencia de backend.
 */
function Perfiles({ perfiles, onSeleccionar, onCerrarSesion }) {
  const [aviso, setAviso] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState('')

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
          {perfiles.map((perfil, index) => (
            <li key={perfil.id} style={{ '--perfil-index': index }}>
              <button className="perfil-card" type="button" onClick={() => onSeleccionar(perfil.id)}>
                <span className="perfil-card__avatar">
                  <AvatarPerfil perfil={perfil} tamano="xl" />
                </span>
                <strong className="perfil-card__name">{perfil.nombre}</strong>
                <span className="perfil-card__meta">
                  Perfil principal{PROVEEDORES[perfil.proveedor] ? ` · ${PROVEEDORES[perfil.proveedor]}` : ''}
                </span>
              </button>
            </li>
          ))}

          <li style={{ '--perfil-index': perfiles.length }}>
            <button
              className="perfil-card perfil-card--add"
              type="button"
              aria-describedby="perfiles-aviso"
              onClick={() => setAviso(true)}
            >
              <span className="perfil-card__avatar perfil-card__avatar--add" aria-hidden="true">+</span>
              <strong className="perfil-card__name">Agregar perfil</strong>
              <span className="perfil-card__meta">Próximamente</span>
            </button>
          </li>
        </ul>

        <p id="perfiles-aviso" className={`perfiles-aviso${aviso ? ' perfiles-aviso--visible' : ''}`} role="status">
          Los perfiles adicionales necesitan guardarse en la base de datos de Butaca para separar
          emociones, favoritos y recomendaciones. Por ahora usás el perfil principal de tu cuenta.
        </p>

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
