import { useCallback, useEffect, useMemo, useState } from 'react'

import './GaleriaPrincipal.css'
import Footer from '../../components/Footer/Footer.jsx'
import CuadriculaContenido from './components/CuadriculaContenido.jsx'
import DetalleContenido from './components/DetalleContenido.jsx'
import EncabezadoGaleria from './components/EncabezadoGaleria.jsx'
import EstadoGaleria from './components/EstadoGaleria.jsx'
import FiltrosGaleria from './components/FiltrosGaleria.jsx'
import { obtenerCatalogo } from './services/catalogo.js'
import { obtenerRecomendacionesRecientes } from '../../services/recomendaciones.js'

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con la capa de catálogo */
// encabezado: desde pf20 App.jsx pasa el encabezado global con navegación y
// menú de usuario. Sin él se conserva el encabezado original de pf10.
function GaleriaPrincipal({ encabezado }) {
  const [contenidos, setContenidos] = useState([])
  const [categoria, setCategoria] = useState('Todos')
  const [seleccionado, setSeleccionado] = useState(null)
  const [estado, setEstado] = useState('loading')

  const cargarCatalogo = useCallback(async () => {
    try {
      const catalogo = await obtenerCatalogo()
      const combinados = [...catalogo, ...obtenerRecomendacionesRecientes()]
        .filter((item, indice, lista) => lista.findIndex((otro) => otro.id === item.id) === indice)
      setContenidos(combinados)
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

  const categorias = useMemo(() => [
    'Todos',
    ...[...new Set(contenidos.flatMap((contenido) => contenido.generos ?? []))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es')),
  ], [contenidos])

  useEffect(() => {
    if (!categorias.includes(categoria)) setCategoria('Todos')
  }, [categoria, categorias])

  const mostrandoDemostracion = useMemo(
    () => contenidos.length > 0 && contenidos.every((contenido) => contenido.esDemostracion === true),
    [contenidos],
  )

  const recargarCatalogo = () => {
    setEstado('loading')
    cargarCatalogo()
  }

  return (
    <div className="gallery-page">
      {encabezado ?? <EncabezadoGaleria />}
      <main className="gallery-main">
        <h1 className="visually-hidden">Galería principal de Butaca</h1>
        <FiltrosGaleria categorias={categorias} activa={categoria} onChange={setCategoria} />
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
      <Footer />

      {seleccionado && <DetalleContenido contenido={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  )
}

export default GaleriaPrincipal
