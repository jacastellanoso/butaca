import { useCallback, useEffect, useRef, useState } from 'react'

import './GaleriaPrincipal.css'
import Footer from '../../components/Footer/Footer.jsx'
import { EMOTIONS } from '../Rostro/emotions.js'
import CuadriculaContenido from './components/CuadriculaContenido.jsx'
import DetalleContenido from './components/DetalleContenido.jsx'
import EncabezadoGaleria from './components/EncabezadoGaleria.jsx'
import EstadoGaleria from './components/EstadoGaleria.jsx'
import FiltrosGaleria from './components/FiltrosGaleria.jsx'
import { CATEGORIAS, claveFiltros, combinarPagina, hayMasPaginas, pedirConReintentos } from './paginacion.js'
import { obtenerPaginaCatalogo } from './services/catalogo.js'
import { obtenerRecomendacionesRecientes } from '../../services/recomendaciones.js'

const LISTA_VACIA = { contenidos: [], pagina: 0, totalPaginas: 0, estado: 'loading', cargandoMas: false, errorMas: false, error: '' }
const ESPERA_BUSQUEDA_MS = 450
const esperar = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

// Filtro opcional por emoción: independiente del escaneo facial.
const EMOCIONES_FILTRO = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
  .map((clave) => ({ clave, etiqueta: EMOTIONS[clave].label }))

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con la capa de catálogo */
// encabezado: desde pf20 App.jsx pasa el encabezado global con navegación y
// menú de usuario. Sin él se conserva el encabezado original de pf10.
//
// Cada combinación de filtros (categoría, emoción y búsqueda) tiene su propia
// lista paginada en catalog-service. «Cargar más» pide la página siguiente
// de esa combinación sin repetir títulos; volver a una combinación ya vista
// conserva lo cargado. Si Render está despertando el catálogo, la primera
// página se reintenta sola durante ~70 s antes de mostrar el error.
function GaleriaPrincipal({ encabezado }) {
  const [listas, setListas] = useState({})
  const [categoria, setCategoria] = useState('Todos')
  const [emocion, setEmocion] = useState(null)
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState(null)
  const pidiendo = useRef(new Set())
  const montado = useRef(true)

  // Se restablece al montar: StrictMode desmonta y vuelve a montar en desarrollo.
  useEffect(() => {
    montado.current = true
    return () => { montado.current = false }
  }, [])

  // La búsqueda se aplica al dejar de escribir (o al presionar Enter).
  useEffect(() => {
    const id = window.setTimeout(() => setBusqueda(texto.trim()), ESPERA_BUSQUEDA_MS)
    return () => window.clearTimeout(id)
  }, [texto])

  const filtros = { categoria, emocion, busqueda }
  const clave = claveFiltros(filtros)

  const actualizar = useCallback((claveLista, cambio) => {
    if (!montado.current) return
    setListas((actuales) => ({ ...actuales, [claveLista]: cambio(actuales[claveLista] ?? LISTA_VACIA) }))
  }, [])

  const cargarPagina = useCallback(async (filtrosLista, pagina) => {
    const claveLista = claveFiltros(filtrosLista)
    const peticion = `${claveLista}:${pagina}`
    if (pidiendo.current.has(peticion)) return
    pidiendo.current.add(peticion)
    actualizar(claveLista, (lista) => (pagina === 1 ? { ...LISTA_VACIA } : { ...lista, cargandoMas: true, errorMas: false }))
    try {
      const pedir = () => obtenerPaginaCatalogo({ ...filtrosLista, pagina })
      // La primera página se reintenta sola; «Cargar más» muestra su error enseguida.
      const respuesta = pagina === 1
        ? await pedirConReintentos(pedir, {
          esperar,
          cancelado: () => !montado.current,
          alEsperar: () => actualizar(claveLista, (lista) => ({ ...lista, estado: 'despertando' })),
        })
        : await pedir()
      // En la vista general se suman las recomendaciones recientes de este navegador.
      const general = filtrosLista.categoria === 'Todos' && !filtrosLista.emocion && !filtrosLista.busqueda
      const nuevos = pagina === 1 && general
        ? [...respuesta.resultados, ...obtenerRecomendacionesRecientes()]
        : respuesta.resultados
      actualizar(claveLista, (lista) => ({
        contenidos: combinarPagina(pagina === 1 ? [] : lista.contenidos, nuevos, filtrosLista.categoria),
        pagina: respuesta.pagina,
        totalPaginas: respuesta.totalPaginas,
        estado: 'ready',
        cargandoMas: false,
        errorMas: false,
        error: '',
      }))
    } catch (error) {
      if (error?.codigo === 'cancelado') return
      console.error('No fue posible cargar el catálogo.', error)
      actualizar(claveLista, (lista) => (pagina === 1
        ? { ...LISTA_VACIA, estado: 'error', error: error?.status >= 500 || error?.codigo === 'sin-conexion' ? 'servicio' : 'consulta' }
        : { ...lista, cargandoMas: false, errorMas: true }))
    } finally {
      pidiendo.current.delete(peticion)
    }
  }, [actualizar])

  const lista = listas[clave] ?? LISTA_VACIA

  useEffect(() => {
    if (!listas[clave]) cargarPagina({ categoria, emocion, busqueda }, 1)
  }, [clave, listas, cargarPagina, categoria, emocion, busqueda])

  const mostrandoDemostracion = lista.contenidos.length > 0 && lista.contenidos.every((c) => c.esDemostracion === true)
  const hayMas = lista.estado === 'ready' && hayMasPaginas(lista)
  const filtrando = Boolean(busqueda || emocion || categoria !== 'Todos')
  const emocionActiva = EMOCIONES_FILTRO.find((e) => e.clave === emocion)

  const enviarBusqueda = (event) => {
    event.preventDefault()
    setBusqueda(texto.trim())
  }

  const limpiar = () => {
    setTexto('')
    setBusqueda('')
    setEmocion(null)
    setCategoria('Todos')
  }

  return (
    <div className="gallery-page">
      {encabezado ?? <EncabezadoGaleria />}
      <main className="gallery-main">
        <h1 className="visually-hidden">Galería principal de Butaca</h1>

        <div className="gallery-toolbar">
          <form className="gallery-search" role="search" onSubmit={enviarBusqueda}>
            <label className="visually-hidden" htmlFor="gallery-buscar">Buscar películas y series por nombre</label>
            <svg className="gallery-search__icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.2 4.2a1 1 0 0 1-1.4 1.4l-4.2-4.2A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
            </svg>
            <input
              id="gallery-buscar"
              type="search"
              placeholder="Buscar películas y series"
              autoComplete="off"
              enterKeyHint="search"
              maxLength={120}
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
            />
            {texto && (
              <button type="button" className="gallery-search__limpiar" onClick={() => { setTexto(''); setBusqueda('') }} aria-label="Borrar búsqueda">
                <span aria-hidden="true">×</span>
              </button>
            )}
          </form>

          <FiltrosGaleria categorias={CATEGORIAS} activa={categoria} onChange={setCategoria} />

          <div className="gallery-emotions" role="group" aria-label="Explorar por emoción">
            <span className="gallery-emotions__titulo" aria-hidden="true">Por emoción</span>
            {EMOCIONES_FILTRO.map(({ clave: claveEmocion, etiqueta }) => (
              <button
                key={claveEmocion}
                type="button"
                className={`gallery-emotion${emocion === claveEmocion ? ' gallery-emotion--active' : ''}`}
                aria-pressed={emocion === claveEmocion}
                onClick={() => setEmocion((actual) => (actual === claveEmocion ? null : claveEmocion))}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        {filtrando && (
          <p className="gallery-resumen" role="status">
            {busqueda ? <>Resultados para <strong>«{busqueda}»</strong></> : 'Explorando'}
            {categoria !== 'Todos' && <> en <strong>{categoria}</strong></>}
            {emocionActiva && <> relacionados con <strong>{emocionActiva.etiqueta.toLowerCase()}</strong></>}
            <button type="button" className="gallery-resumen__limpiar" onClick={limpiar}>Quitar filtros</button>
          </p>
        )}

        {mostrandoDemostracion && (
          <p className="gallery-demo-note">Vista de demostración mientras se integra el catálogo real.</p>
        )}

        {lista.estado === 'loading' && <EstadoGaleria estado="loading" />}
        {lista.estado === 'despertando' && <EstadoGaleria estado="despertando" />}
        {lista.estado === 'error' && (
          <EstadoGaleria estado="error" motivo={lista.error} onRetry={() => cargarPagina(filtros, 1)} />
        )}
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
                  onClick={() => cargarPagina(filtros, lista.pagina + 1)}
                  disabled={lista.cargandoMas}
                  aria-busy={lista.cargandoMas}
                >
                  {lista.cargandoMas && <span className="gallery-more__spinner" aria-hidden="true" />}
                  {lista.cargandoMas ? 'Cargando más títulos…' : 'Cargar más'}
                </button>
              )}
              {!hayMas && (
                <p className="gallery-more__fin">
                  {filtrando ? 'No hay más resultados para estos filtros.' : 'Ya viste todos los títulos disponibles.'}
                </p>
              )}
              <p className="visually-hidden">{lista.contenidos.length} títulos en pantalla.</p>
            </div>
          </>
        )}
        {lista.estado === 'ready' && lista.contenidos.length === 0 && (
          <EstadoGaleria estado="empty" busqueda={busqueda} onLimpiar={filtrando ? limpiar : undefined} />
        )}
      </main>
      <Footer />

      {seleccionado && <DetalleContenido contenido={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  )
}

export default GaleriaPrincipal
