import logoBlanco from '../../../logobutacablanco.svg'
import { OPCIONES } from '../Encabezado/opcionesNavegacion.jsx'
import './Footer.css'

// Mismas opciones e íconos que la navegación principal (Encabezado).
function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <section className="site-footer__brand" aria-label="Butaca">
          <img draggable={false} className="site-footer__logo" src={logoBlanco} alt="Butaca" />
          <p className="site-footer__tagline">Que nadie pierda veinte minutos decidiendo qué ver.</p>
        </section>

        <nav className="site-footer__column site-footer__menu" aria-labelledby="site-footer-menu">
          <h2 id="site-footer-menu" className="site-footer__heading">Menú</h2>
          <ul className="site-footer__list">
            {OPCIONES.map(({ clave, href, etiqueta, etiquetaCorta, icono, imagen }) => (
              <li key={clave}>
                <a className={`site-footer__link site-footer__link--${clave}`} href={href}>
                  <span className="site-footer__icon" aria-hidden="true">
                    {imagen ? <img draggable={false} src={imagen} alt="" /> : icono}
                  </span>
                  <span>{etiquetaCorta ?? etiqueta}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section className="site-footer__column site-footer__sobre" aria-labelledby="site-footer-about">
          <h2 id="site-footer-about" className="site-footer__heading">Sobre Butaca</h2>
          <p className="site-footer__about">
            Butaca recomienda películas y series según la expresión que elegís analizar o la emoción que
            seleccionás, y te ayuda a explorar el catálogo sin perder tiempo eligiendo.
          </p>
        </section>
      </div>

      <div className="site-footer__bottom">
        <p className="site-footer__copy">© 2026 Butaca · Proyecto académico</p>
        <ul className="site-footer__legal" aria-label="Información legal">
          <li><a className="site-footer__legal-link" href="/privacidad">Privacidad</a></li>
          <li><a className="site-footer__legal-link" href="/terminos">Términos y condiciones</a></li>
        </ul>
      </div>
    </footer>
  )
}

export default Footer
