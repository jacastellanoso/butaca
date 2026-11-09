import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/montserrat/latin-400.css'
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import './index.css'
import App from './App.jsx'
import { instalarNavegacion } from './lib/rutas.js'

// Antes del primer render: convierte enlaces viejos con # en rutas reales.
instalarNavegacion()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
