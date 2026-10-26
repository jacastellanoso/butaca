import { useEffect, useState } from 'react'

import Main from './pages/Main/Main.jsx'
import Rostro from './pages/Rostro/Rostro.jsx'
import './App.css'

// Acceso temporal a la pantalla de rostro mediante /#rostro hasta que exista
// la navegación definitiva. Cualquier otro hash (incluido el retorno de OAuth)
// sigue mostrando Main.
const ROSTRO_HASH = '#rostro'

const isRostroHash = () => window.location.hash === ROSTRO_HASH

function App() {
  const [showRostro, setShowRostro] = useState(isRostroHash)

  useEffect(() => {
    const handleHashChange = () => setShowRostro(isRostroHash())

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return showRostro ? <Rostro /> : <Main />
}

export default App
