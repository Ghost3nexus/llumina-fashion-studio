import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@react-three/fiber',
      '@react-three/drei',
      'three'
    ],
    force: true
  },
  build: {
    target: 'esnext'
  }
})
