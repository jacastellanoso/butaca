import { app } from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.port, () => {
  console.log(`API Gateway de Butaca disponible en http://localhost:${env.port}`)
})

function shutdown(signal) {
  console.log(`API Gateway recibió ${signal}. Cerrando conexiones...`)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
