import logoButaca from '../../../logobutacaoficial.svg'
import './Footer.css'

// Rutas reales de la aplicación (src/lib/rutas.js).
const menuLinks = [
  { label: 'Explorar películas', href: '/galeria' },
  { label: 'Escanearme', href: '/rostro' },
  { label: 'Mis recomendaciones', href: '/recomendaciones' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Favoritos', href: '/favoritos' },
]

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <section className="site-footer__brand" aria-label="Butaca">
          <img draggable={false} className="site-footer__logo" src={logoButaca} alt="Butaca" />
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
        <ul className="site-footer__legal" aria-label="Información legal">
          <li><a className="site-footer__link" href="/privacidad">Privacidad</a></li>
          <li><a className="site-footer__link" href="/terminos">Términos y condiciones</a></li>
        </ul>
      </div>
    </footer>
  )
}

export default Footer
