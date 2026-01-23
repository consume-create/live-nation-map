import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'redirect-root',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '') {
            res.writeHead(302, { Location: '/map/' })
            res.end()
            return
          }
          next()
        })
      },
    },
  ],
  base: '/map/',
  assetsInclude: ['**/*.glsl'],
})
