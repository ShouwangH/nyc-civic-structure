import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      async configureServer(server) {
        // Only import server middleware in development
        const { createApiMiddleware } = await import('./server')
        server.middlewares.use(createApiMiddleware());
      },
    },
  ],
})
