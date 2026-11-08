/** Dato que falta definir o aprobar en los borradores legales; se ve resaltado. */
function Pendiente({ children }) {
  return <mark className="legal-pendiente">[Pendiente: {children}]</mark>
}

export default Pendiente
