import { useCallback, useEffect, useMemo, useState } from 'react'

import './GaleriaPrincipal.css'
import Footer from '../../components/Footer/Footer.jsx'
import CuadriculaContenido from './components/CuadriculaContenido.jsx'
import DetalleContenido from './components/DetalleContenido.jsx'
import EncabezadoGaleria from './components/EncabezadoGaleria.jsx'
import EstadoGaleria from './components/EstadoGaleria.jsx'
import FiltrosGaleria from './components/FiltrosGaleria.jsx'
import { categoriasGaleria } from './data/contenidosDemo.js'
import { obtenerCatalogo } from './services/catalogo.js'

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con la capa de catálogo */
function GaleriaPrincipal() {
  const [contenidos, setContenidos] = useState([])
  const [categoria, setCategoria] = useState('Todos')
  const [seleccionado, setSeleccionado] = useState(null)
  const [estado, setEstado] = useState('loading')
  const [notice, setNotice] = useState('')

  const cargarCatalogo = useCallback(async () => {
    try {
      setContenidos(await obtenerCatalogo())
      setEstado('ready')
    } catch (error) {
      console.error('No fue posible cargar el catálogo.', error)
      setEstado('error')
    }
  }, [])

  useEffect(() => {
    cargarCatalogo()
  }, [cargarCatalogo])

  const filtrados = useMemo(() => {
    if (categoria === 'Todos') return contenidos
    return contenidos.filter((contenido) => contenido.generos.includes(categoria))
  }, [categoria, contenidos])

  const mostrandoDemostracion = useMemo(
    () => contenidos.length > 0 && contenidos.every((contenido) => contenido.esDemostracion === true),
    [contenidos],
  )

  const handleRecommendations = () => {
    setNotice('Mis Recomendaciones estará disponible cuando se integre pf15.')
    window.setTimeout(() => setNotice(''), 3500)
  }

  const recargarCatalogo = () => {
    setEstado('loading')
    cargarCatalogo()
  }

  return (
    <div className="gallery-page">
      <EncabezadoGaleria onRecommendations={handleRecommendations} />
      <main className="gallery-main">
        <h1 className="visually-hidden">Galería principal de Butaca</h1>
        <FiltrosGaleria categorias={categoriasGaleria} activa={categoria} onChange={setCategoria} />
        {mostrandoDemostracion && (
          <p className="gallery-demo-note">Vista de demostración mientras se integra el catálogo real.</p>
        )}

        {estado === 'loading' && <EstadoGaleria estado="loading" />}
        {estado === 'error' && <EstadoGaleria estado="error" onRetry={recargarCatalogo} />}
        {estado === 'ready' && filtrados.length > 0 && (
          <CuadriculaContenido contenidos={filtrados} onSelect={setSeleccionado} />
        )}
        {estado === 'ready' && filtrados.length === 0 && <EstadoGaleria estado="empty" />}
      </main>
      <Footer onRecommendations={handleRecommendations} />

      <p className={`gallery-notice${notice ? ' gallery-notice--visible' : ''}`} role="status" aria-live="polite">
        {notice}
      </p>
      {seleccionado && <DetalleContenido contenido={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  )
}

export default GaleriaPrincipal