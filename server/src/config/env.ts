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
  BOT_API_SECRET: z.string().min(1, 'BOT_API_SECRET is required'),
  BOT_HTTP_URL: z.string().default('http://localhost:8081'),
  INSTAGRAM_APP_ID: z.string().optional().default(''),
  INSTAGRAM_APP_SECRET: z.string().optional().default(''),
  INSTAGRAM_VERIFY_TOKEN: z.string().optional().default(''),
  INSTAGRAM_REDIRECT_URI: z.string().optional().default(''),
  INSTAGRAM_TOKEN_ENC_KEY: z.string().optional().default(''),
  // Origin of the admin SPA — where the Instagram OAuth callback redirects the browser back to
  // after connecting. Falls back to the first CORS_ORIGINS entry when unset.
  ADMIN_PANEL_URL: z.string().optional().default(''),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Environment validation failed — check server/.env against .env.example')
}

export const env = parsed.data
