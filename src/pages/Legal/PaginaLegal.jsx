import logoBlanco from '../../../logobutacablanco.svg'
import Footer from '../../components/Footer/Footer.jsx'
import { ACTUALIZADO, PRIVACIDAD, TERMINOS } from './textosLegales.jsx'
import './PaginaLegal.css'

const PAGINAS = {
  privacidad: { titulo: 'Política de privacidad', secciones: PRIVACIDAD, otra: { href: '/terminos', texto: 'Términos y condiciones' } },
  terminos: { titulo: 'Términos y condiciones', secciones: TERMINOS, otra: { href: '/privacidad', texto: 'Política de privacidad' } },
}

/** /privacidad y /terminos: se ven con o sin sesión. */
function PaginaLegal({ tipo }) {
  const pagina = PAGINAS[tipo] ?? PAGINAS.privacidad

  return (
    <div className="legal-page">
      <header className="legal-header">
        <a href="/" aria-label="Butaca: ir al inicio" draggable={false}>
          <img src={logoBlanco} alt="Butaca" draggable={false} />
        </a>
      </header>

      <main className="legal-main">
        <article className="legal-card" aria-labelledby="legal-titulo">
          <p className="legal-eyebrow">Información legal</p>
          <h1 id="legal-titulo">{pagina.titulo}</h1>
          <p className="legal-fecha">Última actualización: {ACTUALIZADO}</p>
          <p className="legal-borrador" role="note">
            <strong>Borrador para revisión legal.</strong> Este texto describe el funcionamiento actual de Butaca y todavía
            no fue aprobado. Los datos marcados como pendientes deben completarse antes de su publicación definitiva.
          </p>

          <nav className="legal-indice" aria-label="Contenido">
            <ol>
              {pagina.secciones.map((s) => (
                <li key={s.id}><a href={`#${s.id}`}>{s.titulo}</a></li>
              ))}
            </ol>
          </nav>

          {pagina.secciones.map((s, indice) => (
            <section key={s.id} id={s.id} className="legal-seccion" aria-labelledby={`${s.id}-titulo`}>
              <h2 id={`${s.id}-titulo`}>{indice + 1}. {s.titulo}</h2>
              {s.contenido}
            </section>
          ))}

          <p className="legal-otra">
            Consultá también: <a href={pagina.otra.href}>{pagina.otra.texto}</a>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}

export default PaginaLegal
