import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    cors: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
  },
})
