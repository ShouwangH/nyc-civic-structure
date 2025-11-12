import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-router',
      async configureServer(server) {
        // Only import server router in development
        const { createApiMiddleware } = await import('./server/index.ts')
        server.middlewares.use(createApiMiddleware());
      },
    },
  ],
})
