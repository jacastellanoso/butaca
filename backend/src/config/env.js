import 'dotenv/config'

// Único lugar donde se lee process.env. El resto del backend importa `env`.
// pf15_Zod reemplazará esta lectura por un esquema que valide cada variable.
export const env = {
  port: Number(process.env.PORT) || 3010,
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
}