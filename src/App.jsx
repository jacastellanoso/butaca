import { useEffect, useState } from 'react'

import Main from './pages/Main/Main.jsx'
import Rostro from './pages/Rostro/Rostro.jsx'
import GaleriaPrincipal from './pages/Galeria/GaleriaPrincipal.jsx'
import './App.css'

// Acceso temporal a la pantalla de rostro mediante /#rostro hasta que exista
// la navegación definitiva. Cualquier otro hash (incluido el retorno de OAuth)
// sigue mostrando Main.
const getCurrentScreen = () => {
  if (window.location.hash === '#rostro') return 'rostro'
  if (window.location.hash === '#galeria') return 'galeria'
  return 'main'
}

function App() {
  const [currentScreen, setCurrentScreen] = useState(getCurrentScreen)

  useEffect(() => {
    const handleHashChange = () => setCurrentScreen(getCurrentScreen())

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (currentScreen === 'rostro') return <Rostro />
  if (currentScreen === 'galeria') return <GaleriaPrincipal />
  return <Main />
}

export default App
