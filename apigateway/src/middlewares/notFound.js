export function notFound(req, res) {
  res.status(404).json({
    error: 'Ruta no encontrada en el API Gateway.',
    path: req.originalUrl,
  })
}
