import '../Galeria/GaleriaPrincipal.css'
import './Dashboard.css'
import Footer from '../../components/Footer/Footer.jsx'
import { rutaDeSeccion, SECCIONES_DASHBOARD } from '../../lib/rutas.js'
import SeccionEmociones from './secciones/SeccionEmociones.jsx'
import SeccionFavoritos from './secciones/SeccionFavoritos.jsx'
import SeccionHistorial from './secciones/SeccionHistorial.jsx'
import SeccionRecomendaciones from './secciones/SeccionRecomendaciones.jsx'

const PESTANAS = {
  emociones: 'Mis emociones',
  recomendaciones: 'Mis recomendaciones',
  historial: 'Historial',
  favoritos: 'Mis favoritos',
}

/**
 * Tablero del usuario: emociones, recomendaciones, historial y favoritos.
 * La sección activa sale de la ruta (/dashboard, /recomendaciones, /historial,
 * /favoritos), así cada una se puede abrir desde el encabezado o compartir.
 */
function Dashboard({ encabezado, perfil, seccion = 'emociones', emocion, animoId }) {
  return (
    <div className="dashboard-page">
      {encabezado}

      <main className="dashboard-main">
        <header className="dashboard-hero">
          <p className="dashboard-hero__eyebrow">Tu tablero</p>
          <h1>
            Hola, <span>{perfil?.nombre?.split(' ')[0] ?? 'cinéfilo'}</span>
          </h1>
          <p className="dashboard-hero__lead">Seguí tu ánimo, tus recomendaciones y lo que guardaste para ver.</p>
        </header>

        <nav className="dashboard-tabs" aria-label="Secciones del tablero">
          {SECCIONES_DASHBOARD.map((clave) => (
            <a
              key={clave}
              className="dashboard-tab"
              href={rutaDeSeccion(clave)}
              aria-current={seccion === clave ? 'page' : undefined}
            >
              {PESTANAS[clave]}
            </a>
          ))}
        </nav>

        {seccion === 'emociones' && <SeccionEmociones />}
        {seccion === 'recomendaciones' && <SeccionRecomendaciones emocion={emocion} animoId={animoId} />}
        {seccion === 'historial' && <SeccionHistorial />}
        {seccion === 'favoritos' && <SeccionFavoritos />}
      </main>

      <Footer />
    </div>
  )
}

export default Dashboard
