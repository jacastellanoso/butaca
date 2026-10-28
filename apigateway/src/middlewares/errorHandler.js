export function errorHandler(error, req, res, next) {
  console.error('[gateway] Error no controlado:', error)

  if (res.headersSent) {
    next(error)
    return
  }

  res.status(500).json({ error: 'Error interno del API Gateway.' })
}
