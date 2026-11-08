import { useCallback, useEffect, useMemo, useState } from 'react'

import logoButaca from '../logobutacaoficial.svg'
import Encabezado from './components/Encabezado/Encabezado.jsx'
import FavoritosProvider from './context/FavoritosProvider.jsx'
import { useRuta } from './hooks/useRuta.js'
import { useSesion } from './hooks/useSesion.js'
import { reemplazarHash } from './lib/rutas.js'
import { cerrarSesion } from './lib/supabase.js'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import GaleriaPrincipal from './pages/Galeria/GaleriaPrincipal.jsx'
import Main from './pages/Main/Main.jsx'
import Perfiles from './pages/Perfiles/Perfiles.jsx'
import RostroDeteccion from './pages/Rostro/RostroDeteccion.jsx'
import RegistroNombre from './pages/RegistroNombre/RegistroNombre.jsx'
import {
  guardarPerfilActivo,
  limpiarPerfilActivo,
  perfilDeCuenta,
} from './services/perfiles.js'
import { actualizarNombreUsuario, olvidarSincronizacion } from './services/usuarios.js'
import './App.css'

// Flujo (pf20): Inicio de sesión → Selección de perfil → Galería → Escáner →
// Emoción detectada → Recomendaciones. Sin sesión válida solo se muestra Main,
// cualquiera sea el hash: las pantallas con datos personales quedan protegidas.

function PantallaSesion({ error, onRetry }) {
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
          Verificando tu sesión…
        </p>
      )}
    </main>
  )
}

function App() {
  const sesion = useSesion()
  const ruta = useRuta()
  const usuarioId = sesion.usuario?.id ?? null
  // Se incrementa al elegir perfil para volver a leer sessionStorage.
  const [, setVersionPerfil] = useState(0)

  const [registroActualizado, setRegistroActualizado] = useState(null)
  const registro = registroActualizado?.usuarioId === usuarioId
    ? registroActualizado.valor
    : sesion.registro
  const perfil = useMemo(() => perfilDeCuenta(sesion.usuario, registro), [sesion.usuario, registro])
  const autenticado = sesion.estado === 'autenticado'
  const necesitaNombre = autenticado && (!registro?.nombre || !registro?.apellido || !registro?.edad)
  const necesitaPerfil = autenticado && ruta.pantalla === 'perfiles'

  // Después del login (o con una sesión previa válida) se sale de la bienvenida.
  useEffect(() => {
    if (autenticado && !necesitaNombre && ruta.pantalla === 'inicio') reemplazarHash('#perfiles')
  }, [autenticado, necesitaNombre, ruta.pantalla])

  const seleccionarPerfil = useCallback((perfilId) => {
    guardarPerfilActivo(usuarioId, perfilId)
    setVersionPerfil((n) => n + 1)
    window.location.hash = '#galeria'
  }, [usuarioId])

  const salir = useCallback(async () => {
    await cerrarSesion()
    limpiarPerfilActivo()
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

  if (necesitaPerfil) {
    return <Perfiles perfiles={[perfil]} onSeleccionar={seleccionarPerfil} onCerrarSesion={salir} />
  }

  const activa = ruta.pantalla === 'dashboard' ? ruta.seccion : ruta.pantalla
  const encabezado = <Encabezado activa={activa} perfil={perfil} onCerrarSesion={salir} />

  return (
    <FavoritosProvider usuarioId={usuarioId}>
      {ruta.pantalla === 'rostro' && (
        <div className="app-shell">
          {encabezado}
          <RostroDeteccion />
        </div>
      )}
      {ruta.pantalla === 'dashboard' && (
        <Dashboard
          encabezado={encabezado}
          perfil={perfil}
          seccion={ruta.seccion}
          emocion={ruta.emocion}
          animoId={ruta.animoId}
        />
      )}
      {(ruta.pantalla === 'galeria' || ruta.pantalla === 'inicio') && <GaleriaPrincipal encabezado={encabezado} />}
    </FavoritosProvider>
  )
}

export default App
