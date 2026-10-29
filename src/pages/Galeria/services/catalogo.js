import { contenidosDemo } from '../data/contenidosDemo.js'

/**
 * Punto único de acceso al catálogo. pf14 sustituirá esta respuesta por una
 * solicitud al API Gateway (`/api/catalogo`) sin modificar los componentes.
 */
export async function obtenerCatalogo() {
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  return contenidosDemo
}
