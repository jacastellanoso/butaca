// GET /api/sesiones: identidad verificada previamente por requireAuth.
export function obtenerSesion(req, res) {
  const { id, email } = req.user
  res.json({ id, email })
}
