import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Production builds are served from https://<WEB_DOMAIN>/admin/ (deploy/Caddyfile), dev from /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
}))
