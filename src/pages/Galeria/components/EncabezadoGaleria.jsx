import logoButaca from '../../../../logobutacaoficial.svg'
import iconoEscanear from '../../../../iconoescanearme.svg'
import iconoRecomendaciones from '../../../../iconomisreconocimientos.svg'

function EncabezadoGaleria({ onRecommendations }) {
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
        <button className="gallery-action gallery-action--recommendations" type="button" onClick={onRecommendations}>
          <img src={iconoRecomendaciones} alt="" aria-hidden="true" />
          <span>Mis Recomendaciones</span>
        </button>
      </nav>
    </header>
  )
}

export default EncabezadoGaleria
