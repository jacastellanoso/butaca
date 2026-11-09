import iconoEscanear from '../../../iconoescanearme.svg'
import iconoRecomendaciones from '../../../iconomisreconocimientos.svg'
import { IconoCorazon } from '../BotonFavorito/BotonFavorito.jsx'
import { IconoDashboard, IconoGaleria, IconoGrupos, IconoPerfiles } from './IconosNavegacion.jsx'

// Opciones del menú principal. `clave` coincide con la pantalla o sección activa.
// Perfiles solo se muestra en pantallas medianas y chicas (en escritorio está
// en el menú de usuario).
export const OPCIONES = [
  { clave: 'galeria', href: '/galeria', etiqueta: 'Galería', icono: <IconoGaleria /> },
  { clave: 'rostro', href: '/rostro', etiqueta: 'Escanearme', imagen: iconoEscanear },
  { clave: 'recomendaciones', href: '/recomendaciones', etiqueta: 'Mis recomendaciones', etiquetaCorta: 'Recomendaciones', imagen: iconoRecomendaciones },
  { clave: 'grupos', href: '/grupos', etiqueta: 'Grupos', icono: <IconoGrupos /> },
  { clave: 'dashboard', href: '/dashboard', etiqueta: 'Dashboard', icono: <IconoDashboard /> },
  { clave: 'favoritos', href: '/favoritos', etiqueta: 'Favoritos', icono: <IconoCorazon lleno /> },
  { clave: 'perfiles', href: '/perfiles', etiqueta: 'Perfiles', icono: <IconoPerfiles /> },
]
