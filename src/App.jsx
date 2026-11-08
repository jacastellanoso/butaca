import { useCallback, useEffect, useMemo, useState } from 'react'

import logoButaca from '../logobutacaoficial.svg'
import Encabezado from './components/Encabezado/Encabezado.jsx'
import FavoritosProvider from './context/FavoritosProvider.jsx'
import { useRuta } from './hooks/useRuta.js'
import { useSesion } from './hooks/useSesion.js'
import { fijarPerfilActivo } from './lib/perfilActivo.js'
import { reemplazarHash } from './lib/rutas.js'
import { cerrarSesion } from './lib/supabase.js'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import GaleriaPrincipal from './pages/Galeria/GaleriaPrincipal.jsx'
import Grupos from './pages/Grupos/Grupos.jsx'
import Main from './pages/Main/Main.jsx'
import Perfiles from './pages/Perfiles/Perfiles.jsx'
import RostroDeteccion from './pages/Rostro/RostroDeteccion.jsx'
import RegistroNombre from './pages/RegistroNombre/RegistroNombre.jsx'
import {
  actualizarPerfil,
  crearPerfil,
  elegirPerfilActivo,
  eliminarPerfil,
  guardarPerfilActivo,
  limpiarPerfilActivo,
  listarPerfiles,
  obtenerPerfilActivo,
  perfilDeCuenta,
} from './services/perfiles.js'
import { actualizarNombreUsuario, olvidarSincronizacion } from './services/usuarios.js'
import './App.css'

// Flujo: Inicio de sesión → (registro de nombre, apellido y edad) → Selección
// de perfil → Galería → Escáner → Emoción detectada → Recomendaciones.
// Sin sesión válida solo se muestra Main, cualquiera sea el hash: las
// pantallas con datos personales quedan protegidas.
//
// Perfiles: cada cuenta tiene varios perfiles (auth-service). El perfil activo
// viaja en X-Butaca-Perfil y cada microservicio separa con él ánimos,
// favoritos, historial y notificaciones. Al cambiar de perfil se vuelve a
// montar el contenido (key) para que nada del perfil anterior quede en pantalla.

function PantallaSesion({ error, onRetry, mensaje = 'Verificando tu sesión…' }) {
  return (
    <main className="app-splash" aria-busy={!error}>
      <img className="app-splash__logo" src={logoButaca} alt="Butaca" />
      {error ? (
        <div className="app-splash__error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Reintentar</button>
        </div>
      ) : (
        <p className="app-splash__status" role="status">
          <span className="app-splash__spinner" aria-hidden="true" />
          {mensaje}
        </p>
      )}
    </main>
  )
}

const SIN_PERFILES = { usuarioId: null, estado: 'loading', lista: null, error: '' }

function App() {
  const sesion = useSesion()
  const ruta = useRuta()
  const usuarioId = sesion.usuario?.id ?? null

  const [registroActualizado, setRegistroActualizado] = useState(null)
  const registro = registroActualizado?.usuarioId === usuarioId
    ? registroActualizado.valor
    : sesion.registro
  const cuenta = useMemo(() => perfilDeCuenta(sesion.usuario, registro), [sesion.usuario, registro])
  const autenticado = sesion.estado === 'autenticado'
  const necesitaNombre = autenticado && (!registro?.nombre || !registro?.apellido || !registro?.edad)

  // ── Perfiles de la cuenta ────────────────────────────────────────────
  const [perfiles, setPerfiles] = useState(SIN_PERFILES)
  const [elegido, setElegido] = useState({ usuarioId: null, perfilId: null })

  const cargarPerfiles = useCallback(async () => {
    if (!usuarioId) return
    setPerfiles((actual) => (actual.usuarioId === usuarioId ? { ...actual, estado: actual.lista ? 'ready' : 'loading' } : { ...SIN_PERFILES, usuarioId }))
    try {
      const lista = await listarPerfiles(cuenta)
      setPerfiles({ usuarioId, estado: 'ready', lista, error: '' })
    } catch (fallo) {
      setPerfiles((actual) => ({ ...actual, usuarioId, estado: actual.lista ? 'ready' : 'error', error: fallo.message }))
    }
  }, [usuarioId, cuenta])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- carga remota de perfiles al entrar
    if (autenticado && !necesitaNombre) cargarPerfiles()
  }, [autenticado, necesitaNombre, cargarPerfiles])

  const listaPerfiles = perfiles.usuarioId === usuarioId ? perfiles.lista : null
  const estadoPerfiles = perfiles.usuarioId === usuarioId ? perfiles.estado : 'loading'
  const guardadoId = elegido.usuarioId === usuarioId && elegido.perfilId
    ? elegido.perfilId
    : obtenerPerfilActivo(usuarioId)
  // Sin perfiles remotos (servicio caído) se usa la cuenta: el servidor aplica el principal.
  const perfilActivo = elegirPerfilActivo(listaPerfiles, guardadoId) ?? cuenta

  // Se fija durante el render para que las peticiones de los hijos (que se
  // hacen en sus efectos, antes que los efectos de App) ya lleven el perfil.
  fijarPerfilActivo(autenticado && perfilActivo?.remoto ? perfilActivo.id : null)

  // Después del login (o con una sesión previa válida) se sale de la bienvenida.
  useEffect(() => {
    if (autenticado && !necesitaNombre && ruta.pantalla === 'inicio') reemplazarHash('#perfiles')
  }, [autenticado, necesitaNombre, ruta.pantalla])

  const activarPerfil = useCallback((perfilId) => {
    guardarPerfilActivo(usuarioId, perfilId)
    setElegido({ usuarioId, perfilId })
  }, [usuarioId])

  const seleccionarPerfil = useCallback((perfilId) => {
    activarPerfil(perfilId)
    window.location.hash = '#galeria'
  }, [activarPerfil])

  const crear = useCallback(async (datos) => {
    await crearPerfil(datos, cuenta)
    await cargarPerfiles()
  }, [cargarPerfiles, cuenta])

  const editar = useCallback(async (perfilId, datos) => {
    const actualizado = await actualizarPerfil(perfilId, datos, cuenta)
    // El perfil principal refleja los datos de la cuenta (registro inicial).
    if (actualizado.esPrincipal) {
      setRegistroActualizado({ usuarioId, valor: { ...registro, nombre: datos.nombre, apellido: datos.apellido, edad: datos.edad } })
    }
    await cargarPerfiles()
  }, [cargarPerfiles, cuenta, registro, usuarioId])

  const eliminar = useCallback(async (perfilId) => {
    await eliminarPerfil(perfilId)
    if (perfilId === perfilActivo?.id) {
      limpiarPerfilActivo()
      setElegido({ usuarioId, perfilId: null })
    }
    await cargarPerfiles()
  }, [cargarPerfiles, perfilActivo?.id, usuarioId])

  const salir = useCallback(async () => {
    await cerrarSesion()
    limpiarPerfilActivo()
    fijarPerfilActivo(null)
    setElegido({ usuarioId: null, perfilId: null })
    setPerfiles(SIN_PERFILES)
    olvidarSincronizacion()
    try {
      globalThis.sessionStorage?.removeItem('butaca:historial-registrado')
    } catch {
      // Sin almacenamiento no hay nada que limpiar.
    }
    reemplazarHash('')
  }, [])

  if (sesion.estado === 'cargando') return <PantallaSesion />
  if (sesion.estado === 'error') return <PantallaSesion error={sesion.mensaje} onRetry={sesion.reintentar} />
  if (!autenticado) return <Main />

  if (necesitaNombre) {
    const guardarNombre = async (nombre, apellido, edad) => {
      const actualizado = await actualizarNombreUsuario(nombre, apellido, edad)
      setRegistroActualizado({ usuarioId, valor: actualizado })
      reemplazarHash('#perfiles')
    }
    return <RegistroNombre onGuardar={guardarNombre} onCerrarSesion={salir} />
  }

  if (ruta.pantalla === 'perfiles') {
    return (
      <Perfiles
        perfiles={listaPerfiles}
        activoId={perfilActivo?.id}
        estado={estadoPerfiles}
        mensajeError={perfiles.error}
        onReintentar={cargarPerfiles}
        onSeleccionar={seleccionarPerfil}
        onCrear={crear}
        onEditar={editar}
        onEliminar={eliminar}
        onCerrarSesion={salir}
      />
    )
  }

  // Hasta conocer los perfiles no se piden datos personales: evita mostrar
  // por un instante los del perfil principal y luego los del elegido.
  if (estadoPerfiles === 'loading' && !listaPerfiles) return <PantallaSesion mensaje="Cargando tu perfil…" />

  const activa = ruta.pantalla === 'dashboard' ? ruta.seccion : ruta.pantalla
  const encabezado = (
    <Encabezado
      activa={activa}
      perfil={perfilActivo}
      perfiles={listaPerfiles ?? []}
      onCambiarPerfil={activarPerfil}
      onCerrarSesion={salir}
    />
  )

  return (
    <FavoritosProvider key={perfilActivo?.id ?? 'cuenta'} usuarioId={usuarioId}>
      {ruta.pantalla === 'rostro' && (
        <div className="app-shell">
          {encabezado}
          <RostroDeteccion />
        </div>
      )}
      {ruta.pantalla === 'dashboard' && (
        <Dashboard
          encabezado={encabezado}
          perfil={perfilActivo}
          seccion={ruta.seccion}
          emocion={ruta.emocion}
          animoId={ruta.animoId}
        />
      )}
      {ruta.pantalla === 'grupos' && <Grupos encabezado={encabezado} grupoId={ruta.grupoId} />}
      {(ruta.pantalla === 'galeria' || ruta.pantalla === 'inicio') && <GaleriaPrincipal encabezado={encabezado} />}
    </FavoritosProvider>
  )
}

export default App
