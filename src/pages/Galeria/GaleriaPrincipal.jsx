import { useCallback, useEffect, useRef, useState } from 'react'

import './GaleriaPrincipal.css'
import Footer from '../../components/Footer/Footer.jsx'
import CuadriculaContenido from './components/CuadriculaContenido.jsx'
import DetalleContenido from './components/DetalleContenido.jsx'
import EncabezadoGaleria from './components/EncabezadoGaleria.jsx'
import EstadoGaleria from './components/EstadoGaleria.jsx'
import FiltrosGaleria from './components/FiltrosGaleria.jsx'
import { CATEGORIAS, combinarPagina, hayMasPaginas } from './paginacion.js'
import { obtenerPaginaCatalogo } from './services/catalogo.js'
import { obtenerRecomendacionesRecientes } from '../../services/recomendaciones.js'

const LISTA_VACIA = { contenidos: [], pagina: 0, totalPaginas: 0, estado: 'loading', cargandoMas: false, errorMas: false }

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con la capa de catálogo */
// encabezado: desde pf20 App.jsx pasa el encabezado global con navegación y
// menú de usuario. Sin él se conserva el encabezado original de pf10.
//
// Cada categoría tiene su propia lista paginada (catalog-service filtra por
// género en TMDB). «Cargar más» pide la página siguiente de la categoría
// elegida y la agrega sin repetir títulos; cambiar de categoría y volver
// conserva lo ya cargado.
function GaleriaPrincipal({ encabezado }) {
  const [listas, setListas] = useState({})
  const [categoria, setCategoria] = useState('Todos')
  const [seleccionado, setSeleccionado] = useState(null)
  const pidiendo = useRef(new Set())

  const cargarPagina = useCallback(async (cat, pagina) => {
    const clave = `${cat}:${pagina}`
    if (pidiendo.current.has(clave)) return
    pidiendo.current.add(clave)
    setListas((actuales) => {
      const lista = actuales[cat] ?? LISTA_VACIA
      return {
        ...actuales,
        [cat]: pagina === 1 ? { ...LISTA_VACIA } : { ...lista, cargandoMas: true, errorMas: false },
      }
    })
    try {
      const respuesta = await obtenerPaginaCatalogo({ categoria: cat, pagina })
      // En «Todos» se suman las recomendaciones recientes guardadas en este navegador.
      const nuevos = pagina === 1 && cat === 'Todos'
        ? [...respuesta.resultados, ...obtenerRecomendacionesRecientes()]
        : respuesta.resultados
      setListas((actuales) => {
        const lista = actuales[cat] ?? LISTA_VACIA
        return {
          ...actuales,
          [cat]: {
            contenidos: combinarPagina(pagina === 1 ? [] : lista.contenidos, nuevos, cat),
            pagina: respuesta.pagina,
            totalPaginas: respuesta.totalPaginas,
            estado: 'ready',
            cargandoMas: false,
            errorMas: false,
          },
        }
      })
    } catch (error) {
      console.error('No fue posible cargar el catálogo.', error)
      setListas((actuales) => {
        const lista = actuales[cat] ?? LISTA_VACIA
        return {
          ...actuales,
          [cat]: pagina === 1 ? { ...LISTA_VACIA, estado: 'error' } : { ...lista, cargandoMas: false, errorMas: true },
        }
      })
    } finally {
      pidiendo.current.delete(clave)
    }
  }, [])

  const lista = listas[categoria] ?? LISTA_VACIA

  useEffect(() => {
    if (!listas[categoria]) cargarPagina(categoria, 1)
  }, [categoria, listas, cargarPagina])

  const mostrandoDemostracion = lista.contenidos.length > 0 && lista.contenidos.every((c) => c.esDemostracion === true)
  const hayMas = lista.estado === 'ready' && hayMasPaginas(lista)

  return (
    <div className="gallery-page">
      {encabezado ?? <EncabezadoGaleria />}
      <main className="gallery-main">
        <h1 className="visually-hidden">Galería principal de Butaca</h1>
        <FiltrosGaleria categorias={CATEGORIAS} activa={categoria} onChange={setCategoria} />
        {mostrandoDemostracion && (
          <p className="gallery-demo-note">Vista de demostración mientras se integra el catálogo real.</p>
        )}

        {lista.estado === 'loading' && <EstadoGaleria estado="loading" />}
        {lista.estado === 'error' && <EstadoGaleria estado="error" onRetry={() => cargarPagina(categoria, 1)} />}
        {lista.estado === 'ready' && lista.contenidos.length > 0 && (
          <>
            <CuadriculaContenido contenidos={lista.contenidos} onSelect={setSeleccionado} />
            <div className="gallery-more" aria-live="polite">
              {lista.errorMas && (
                <p className="gallery-more__error" role="alert">No pudimos cargar más títulos. Intentá de nuevo.</p>
              )}
              {hayMas && (
                <button
                  type="button"
                  className="gallery-more__button"
                  onClick={() => cargarPagina(categoria, lista.pagina + 1)}
                  disabled={lista.cargandoMas}
                  aria-busy={lista.cargandoMas}
                >
                  {lista.cargandoMas && <span className="gallery-more__spinner" aria-hidden="true" />}
                  {lista.cargandoMas ? 'Cargando más títulos…' : 'Cargar más'}
                </button>
              )}
              {!hayMas && (
                <p className="gallery-more__fin">
                  {categoria === 'Todos' ? 'Ya viste todos los títulos disponibles.' : `Ya viste todos los títulos de ${categoria}.`}
                </p>
              )}
              <p className="visually-hidden">{lista.contenidos.length} títulos en pantalla.</p>
            </div>
          </>
        )}
        {lista.estado === 'ready' && lista.contenidos.length === 0 && <EstadoGaleria estado="empty" />}
      </main>
      <Footer />

      {seleccionado && <DetalleContenido contenido={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  )
}

export default GaleriaPrincipal
