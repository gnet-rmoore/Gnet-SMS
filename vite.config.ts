import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
    port: Number(process.env.VITE_PORT) || 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:8081',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_API_PROXY || 'http://localhost:8081',
        ws: true,
        changeOrigin: true,
      },
      '/exam-socket': {
        target: process.env.VITE_ACADEMIC_PROXY || 'http://localhost:3015',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
