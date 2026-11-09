import { app } from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.port, () => {
  console.log(`${env.serviceName} disponible en http://localhost:${env.port}`)
})

// Docker detiene los contenedores con SIGTERM: cerramos conexiones antes de salir.
function shutdown(signal) {
  console.log(`${env.serviceName} recibió ${signal}. Cerrando conexiones...`)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))