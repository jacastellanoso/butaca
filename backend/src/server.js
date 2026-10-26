import { app } from './app.js'
import { env } from './config/env.js'
import { isSupabaseConfigured } from './lib/supabase.js'

if (!isSupabaseConfigured) {
  console.warn('⚠ Falta SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en backend/.env: las rutas protegidas responderán 500.')
}

app.listen(env.port, () => {
  console.log(`Butaca API escuchando en http://localhost:${env.port}`)
})