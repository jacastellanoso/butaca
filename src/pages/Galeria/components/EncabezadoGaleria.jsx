import logoButaca from '../../../../logobutacaoficial.svg'
import iconoEscanear from '../../../../iconoescanearme.svg'
import iconoRecomendaciones from '../../../../iconomisreconocimientos.svg'

// Encabezado original de pf10. Desde pf20, App.jsx usa el encabezado global
// (components/Encabezado); este queda como respaldo si la galería se monta sola.
function EncabezadoGaleria() {
  return (
    <header className="gallery-header">
      <a className="gallery-brand" href="#galeria" aria-label="Ir al inicio de la galería">
        <img src={logoButaca} alt="Butaca" />
      </a>

      <nav className="gallery-nav" aria-label="Acciones de la galería">
        <a className="gallery-action gallery-action--scan" href="#rostro">
          <img src={iconoEscanear} alt="" aria-hidden="true" />
          <span>Escanearme</span>
        </a>
        <a className="gallery-action gallery-action--recommendations" href="#recomendaciones">
          <img src={iconoRecomendaciones} alt="" aria-hidden="true" />
          <span>Mis Recomendaciones</span>
        </a>
      </nav>
    </header>
  )
}

export default EncabezadoGaleria
