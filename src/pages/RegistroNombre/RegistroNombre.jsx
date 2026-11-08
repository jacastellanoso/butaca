import { useState } from 'react'

import logoButaca from '../../../logobutacaoficial.svg'
import './RegistroNombre.css'

// En celulares el teclado tarda en abrirse: después se desplaza el campo
// enfocado al centro para que ni el teclado ni la barra del navegador lo tapen.
function mostrarCampo(event) {
  const campo = event.target
  if (!(campo instanceof HTMLElement) || !campo.matches('input, button')) return
  window.setTimeout(() => campo.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 300)
}

function RegistroNombre({ onGuardar, onCerrarSesion }) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [edad, setEdad] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (event) => {
    event.preventDefault()
    setError('')
    const edadNumero = Number(edad)
    if (nombre.trim().length < 2 || apellido.trim().length < 2) {
      setError('Escribí tu nombre y apellido completos.')
      return
    }
    if (!Number.isInteger(edadNumero) || edadNumero < 5 || edadNumero > 120) {
      setError('Ingresá una edad válida entre 5 y 120 años.')
      return
    }
    setGuardando(true)
    try {
      await onGuardar(nombre.trim(), apellido.trim(), edadNumero)
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
        <p>Decinos cómo te llamás y tu edad antes de realizar el reconocimiento facial.</p>
        <form onSubmit={enviar} onFocus={mostrarCampo} noValidate>
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" autoComplete="given-name" enterKeyHint="next" maxLength="60" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <label htmlFor="apellido">Apellido</label>
          <input id="apellido" name="apellido" autoComplete="family-name" enterKeyHint="next" maxLength="60" required value={apellido} onChange={(e) => setApellido(e.target.value)} />
          <label htmlFor="edad">Edad</label>
          <input id="edad" name="edad" type="number" inputMode="numeric" autoComplete="off" enterKeyHint="done" min="5" max="120" aria-describedby="edad-ayuda" required value={edad} onChange={(e) => setEdad(e.target.value)} />
          <p className="registro-nombre__help" id="edad-ayuda">La usamos para ofrecer contenido apropiado para tu etapa.</p>
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
