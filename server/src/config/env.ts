import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  SMS_PROVIDER: z.enum(['console', 'eskiz', 'playmobile']).default('console'),
  SMS_API_KEY: z.string().optional().default(''),
  PAYMENT_PROVIDER: z.enum(['mock', 'click', 'payme']).default('mock'),
  ADMIN_BOOTSTRAP_SECRET: z.string().min(1, 'ADMIN_BOOTSTRAP_SECRET is required'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Environment validation failed — check server/.env against .env.example')
}

export const env = parsed.data
