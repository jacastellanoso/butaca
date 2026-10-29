import TarjetaContenido from './TarjetaContenido.jsx'

function CuadriculaContenido({ contenidos, onSelect }) {
  return (
    <section className="content-grid" aria-label="Películas y series">
      {contenidos.map((contenido, index) => (
        <TarjetaContenido key={contenido.id} contenido={contenido} index={index} onSelect={onSelect} />
      ))}
    </section>
  )
}

export default CuadriculaContenido
