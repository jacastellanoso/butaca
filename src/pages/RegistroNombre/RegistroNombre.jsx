import { useState } from 'react'

import logoButaca from '../../../logobutacaoficial.svg'
import './RegistroNombre.css'

function RegistroNombre({ onGuardar, onCerrarSesion }) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (event) => {
    event.preventDefault()
    setError('')
    if (nombre.trim().length < 2 || apellido.trim().length < 2) {
      setError('Escribí tu nombre y apellido completos.')
      return
    }
    setGuardando(true)
    try {
      await onGuardar(nombre.trim(), apellido.trim())
    } catch (fallo) {
      setError(fallo?.message || 'No pudimos guardar tus datos. Intentá de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <main className="registro-nombre">
      <section className="registro-nombre__card" aria-labelledby="registro-titulo">
        <img src={logoButaca} alt="Butaca" />
        <p className="registro-nombre__eyebrow">Tu experiencia comienza aquí</p>
        <h1 id="registro-titulo">Queremos conocerte</h1>
        <p>Decinos cómo te llamás antes de realizar el reconocimiento facial.</p>
        <form onSubmit={enviar}>
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" autoComplete="given-name" maxLength="60" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <label htmlFor="apellido">Apellido</label>
          <input id="apellido" name="apellido" autoComplete="family-name" maxLength="60" required value={apellido} onChange={(e) => setApellido(e.target.value)} />
          {error && <p className="registro-nombre__error" role="alert">{error}</p>}
          <button type="submit" disabled={guardando} aria-busy={guardando}>
            {guardando ? 'Guardando…' : 'Continuar al reconocimiento facial'}
          </button>
        </form>
        <button className="registro-nombre__salir" type="button" onClick={onCerrarSesion}>Cerrar sesión</button>
      </section>
    </main>
  )
}

export default RegistroNombre
