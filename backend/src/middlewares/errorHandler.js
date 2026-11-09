// Manejador central de errores (Express lo reconoce por sus 4 parámetros).
// El detalle se queda en la consola del servidor; al cliente, un mensaje genérico.
// pf16_Seguridad lo endurece.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // JSON mal escrito en el body: es error del cliente, no del servidor.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' })
  }

  console.error(err)
  res.status(500).json({ error: 'Ocurrió un error interno. Intentá de nuevo.' })
}