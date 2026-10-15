import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoPages } from './seo-plugin.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), seoPages()],
  // Shown on Menu → Ma’lumot → Ilova haqida. The Docker build has no .git, so the build time is
  // the version.
  define: { __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()) },
})
