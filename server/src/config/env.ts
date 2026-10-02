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
  // Eskiz.uz (SMS_PROVIDER=eskiz): account login + approved sender nickname (4546 = Eskiz test sender).
  ESKIZ_EMAIL: z.string().optional().default(''),
  ESKIZ_PASSWORD: z.string().optional().default(''),
  ESKIZ_FROM: z.string().optional().default('4546'),
  // Behind Caddy/Nginx: trust X-Forwarded-For so req.ip is the real client, not the proxy.
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
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
  // Off until a real Click/Payme provider is wired in: with the mock provider every top-up
  // "succeeds", so leaving this on would let anyone mint balance. Cash rides still work.
  ONLINE_PAYMENTS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

const parsed = schema
  .superRefine((v, ctx) => {
    if (v.SMS_PROVIDER === 'eskiz' && (!v.ESKIZ_EMAIL || !v.ESKIZ_PASSWORD)) {
      ctx.addIssue({ code: 'custom', path: ['ESKIZ_EMAIL'], message: 'SMS_PROVIDER=eskiz needs ESKIZ_EMAIL and ESKIZ_PASSWORD' })
    }
  })
  .safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Environment validation failed — check server/.env against .env.example')
}

export const env = parsed.data
