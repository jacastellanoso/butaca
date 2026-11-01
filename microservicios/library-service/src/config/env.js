import 'dotenv/config'

// Único lugar donde se lee process.env en este microservicio.
export const env = {
  serviceName: process.env.SERVICE_NAME ?? 'butaca-service',
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
  databaseUrl: process.env.DATABASE_URL ?? '',
  directUrl: process.env.DIRECT_URL ?? '',
}