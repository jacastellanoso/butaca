// Microservicio falso para las pruebas del gateway: responde 200, cuenta las
// peticiones que le llegan y, a propósito, agrega encabezados que el gateway
// debe descartar (un CORS propio con '*' y X-Powered-By).
import { createServer } from 'node:http'

export async function crearServicioFalso() {
  const recibidas = []
  const servidor = createServer((req, res) => {
    const partes = []
    req.on('data', (parte) => partes.push(parte))
    req.on('end', () => {
      recibidas.push({ method: req.method, url: req.url, authorization: req.headers.authorization })
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Powered-By': 'Express',
      })
      res.end(JSON.stringify({ proxied: true }))
    })
  })
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve))
  return { url: `http://127.0.0.1:${servidor.address().port}`, recibidas, servidor }
}

/** Apunta los cinco destinos del gateway al servicio falso. */
export function apuntarServicios(url) {
  for (const variable of [
    'AUTH_SERVICE_URL',
    'EMOTIONS_SERVICE_URL',
    'CATALOG_SERVICE_URL',
    'RECOMMENDATIONS_SERVICE_URL',
    'LIBRARY_SERVICE_URL',
  ]) {
    process.env[variable] = url
  }
}