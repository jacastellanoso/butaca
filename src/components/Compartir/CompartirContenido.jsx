import { useEffect, useState } from 'react'

import { compartirRecomendacion, listarGrupos, obtenerGrupo } from '../../services/grupos.js'
import './CompartirContenido.css'

/* oxlint-disable react/set-state-in-effect -- carga de grupos e integrantes desde auth-service */
/** Formulario para enviar un contenido a un grupo o a un integrante de un grupo. */
function FormularioCompartir({ contenido, onListo }) {
  const [grupos, setGrupos] = useState(null)
  const [grupoId, setGrupoId] = useState('')
  const [miembros, setMiembros] = useState([])
  const [destinatario, setDestinatario] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    let activo = true
    listarGrupos()
      .then((lista) => {
        if (!activo) return
        setGrupos(lista)
        if (lista.length === 1) setGrupoId(lista[0].id)
      })
      .catch((fallo) => activo && setEstado({ tipo: 'error', texto: fallo.message }))
    return () => { activo = false }
  }, [])

  useEffect(() => {
    let activo = true
    setMiembros([])
    setDestinatario('')
    if (!grupoId) return undefined
    obtenerGrupo(grupoId)
      .then((grupo) => activo && setMiembros(grupo.miembros.filter((m) => !m.esYo)))
      .catch(() => activo && setMiembros([]))
    return () => { activo = false }
  }, [grupoId])

  const enviar = async (event) => {
    event.preventDefault()
    if (!grupoId) return setEstado({ tipo: 'error', texto: 'Elegí un grupo.' })
    setEstado({ tipo: 'enviando' })
    try {
      await compartirRecomendacion(grupoId, contenido, { mensaje: mensaje.trim(), destinatarioId: destinatario })
      setEstado({ tipo: 'ok', texto: 'Recomendación compartida.' })
      window.setTimeout(onListo, 900)
    } catch (fallo) {
      setEstado({ tipo: 'error', texto: fallo.message })
    }
  }

  if (grupos === null && !estado) return <p className="compartir__estado" role="status">Cargando tus grupos…</p>
  if (grupos?.length === 0) {
    return (
      <p className="compartir__estado">
        Todavía no tenés grupos. <a href="/grupos">Creá uno</a> para compartir recomendaciones.
      </p>
    )
  }

  return (
    <form className="compartir__form" onSubmit={enviar} noValidate>
      <label htmlFor="compartir-grupo">Grupo</label>
      <select id="compartir-grupo" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
        <option value="">Elegí un grupo…</option>
        {(grupos ?? []).map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
      </select>
      <label htmlFor="compartir-para">Para</label>
      <select id="compartir-para" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} disabled={!grupoId}>
        <option value="">Todo el grupo</option>
        {miembros.map((m) => <option key={m.usuarioId} value={m.usuarioId}>{m.nombre}</option>)}
      </select>
      <label htmlFor="compartir-nota">Mensaje (opcional)</label>
      <input id="compartir-nota" maxLength="280" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="¿Por qué la recomendás?" />
      <div className="compartir__acciones">
        <button type="button" className="compartir__cancelar" onClick={onListo}>Cancelar</button>
        <button type="submit" disabled={estado?.tipo === 'enviando' || estado?.tipo === 'ok'}>Enviar recomendación</button>
      </div>
      {estado?.texto && (
        <p className={`compartir__estado compartir__estado--${estado.tipo}`} role={estado.tipo === 'ok' ? 'status' : 'alert'}>
          {estado.texto}
        </p>
      )}
    </form>
  )
}

/** Botón "Compartir" del detalle: abre el formulario debajo, sin salir del detalle. */
function CompartirContenido({ contenido }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="compartir">
      {!abierto && (
        <button type="button" className="compartir__boton" onClick={() => setAbierto(true)}>
          Compartir con un grupo
        </button>
      )}
      {abierto && <FormularioCompartir contenido={contenido} onListo={() => setAbierto(false)} />}
    </div>
  )
}

export default CompartirContenido
