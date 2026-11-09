export function notFound(req, res) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.path}` })
}