import './Main.css'

import cuadroEfecto from '../../assets/decorations/cuadroefecto.svg'
import githubLogo from '../../assets/icons/logogithub.svg'
import googleLogo from '../../assets/icons/logogoogle.svg'
import lentes from '../../assets/images/lentesdiseño.png'
import palomitas from '../../assets/images/palomitasdiseño.png'
import rollo from '../../assets/images/rollodiseño.png'
import ticket from '../../assets/images/ticketdiseño.png'
import butacaText from '../../assets/text/butacatexto.svg'
import comienzaText from '../../assets/text/comienzaentexto.svg'
import palomitasText from '../../assets/text/palomitastexto.svg'
import preparaText from '../../assets/text/preparatexto.svg'
import tusText from '../../assets/text/tustexto.svg'
import yText from '../../assets/text/ytexto.svg'

const textLayers = [
  { source: preparaText, label: 'Prepara' },
  { source: tusText, label: 'tus' },
  { source: palomitasText, label: 'palomitas' },
  { source: yText, label: 'y' },
  { source: comienzaText, label: 'comienza en' },
  { source: butacaText, label: 'Butaca' },
]

const waveLayers = [1, 2, 3, 4]

function WaveGroup({ position = 'center' }) {
  return (
    <div className={`wave-group wave-group--${position}`} aria-hidden="true">
      {waveLayers.map((layer) => (
        <img
          key={layer}
          className={`wave wave--${layer}`}
          src={cuadroEfecto}
          alt=""
        />
      ))}
    </div>
  )
}

function AccessButton({ provider, icon, variant }) {
  return (
    <div className={`access-button-entry access-button-entry--${variant}`}>
      <button className={`access-button access-button--${variant}`} type="button">
        <img src={icon} alt="" aria-hidden="true" />
        <span>Continuar con {provider}</span>
      </button>
    </div>
  )
}

function Main() {
  return (
    <main className="main-page">
      <div className="background" aria-hidden="true">
        <WaveGroup position="top-left" />
        <WaveGroup position="bottom-right" />
      </div>

      <div className="decorations" aria-hidden="true">
        <img className="decoration decoration--reel" src={rollo} alt="" />
        <img className="decoration decoration--glasses" src={lentes} alt="" />
        <img className="decoration decoration--ticket" src={ticket} alt="" />
        <img className="decoration decoration--popcorn" src={palomitas} alt="" />
      </div>

      <div className="central-scene">
        <WaveGroup />

        <section className="main-content" aria-label="Bienvenida a Butaca">
          <h1 className="visually-hidden">
            Prepara tus palomitas y comienza en Butaca
          </h1>

          <div className="title-composition" aria-hidden="true">
            {textLayers.map(({ source, label }, index) => (
              <img
                key={label}
                className="title-layer"
                src={source}
                alt=""
                style={{ '--layer-index': index }}
              />
            ))}
          </div>

          <div className="access-actions" aria-label="Opciones de acceso">
            <AccessButton provider="Google" icon={googleLogo} variant="google" />
            <AccessButton provider="GitHub" icon={githubLogo} variant="github" />
          </div>
        </section>
      </div>
    </main>
  )
}

export default Main
