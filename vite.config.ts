import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createApiMiddleware } from './server'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use(createApiMiddleware());
      },
    },
  ],
})
