import logoButaca from '../../../logobutacaoficial.svg'
import './Footer.css'

// Rutas reales de la navegación por hash definida en App.jsx.
const menuLinks = [
  { label: 'Inicio', href: '#' },
  { label: 'Explorar películas', href: '#galeria' },
  { label: 'Escanearme', href: '#rostro' },
]

// Mis recomendaciones todavía no tiene pantalla (pf15). Si la pantalla anfitriona
// recibe onRecommendations se muestra como botón; si no, queda como texto.
function Footer({ onRecommendations }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <section className="site-footer__brand" aria-label="Butaca">
          <img className="site-footer__logo" src={logoButaca} alt="Butaca" />
          <p className="site-footer__tagline">Que nadie pierda veinte minutos decidiendo qué ver.</p>
        </section>

        <nav className="site-footer__column" aria-labelledby="site-footer-menu">
          <h2 id="site-footer-menu" className="site-footer__heading">Menú</h2>
          <ul className="site-footer__list">
            {menuLinks.map(({ label, href }) => (
              <li key={href}>
                <a className="site-footer__link" href={href}>{label}</a>
              </li>
            ))}
            <li>
              {onRecommendations ? (
                <button className="site-footer__link" type="button" onClick={onRecommendations}>
                  Mis recomendaciones
                </button>
              ) : (
                <span className="site-footer__link site-footer__link--pending">Mis recomendaciones</span>
              )}
            </li>
          </ul>
        </nav>

        <section className="site-footer__column" aria-labelledby="site-footer-about">
          <h2 id="site-footer-about" className="site-footer__heading">Sobre Butaca</h2>
          <p className="site-footer__about">
            Butaca analiza tu expresión facial para recomendarte películas y series acordes a cómo te
            sentís, y te ayuda a explorar el catálogo sin perder tiempo eligiendo.
          </p>
        </section>
      </div>

      <div className="site-footer__bottom">
        <p className="site-footer__copy">© 2026 Butaca. Todos los derechos reservados.</p>
        {/* Sin páginas legales todavía: se muestran sin enlace hasta que existan. */}
        <ul className="site-footer__legal" aria-label="Información legal">
          <li><span title="Próximamente">Privacidad</span></li>
          <li><span title="Próximamente">Términos y condiciones</span></li>
        </ul>
      </div>
    </footer>
  )
}

export default Footer
