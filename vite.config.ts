import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 3000,
    host: 'localhost',
    strictPort: true,
    // 🔥 REMOVED CORS headers completely - they were blocking Firebase popups
  },
  preview: {
    port: 3000,
    host: 'localhost',
    strictPort: true,
    // 🔥 REMOVED CORS headers completely - they were blocking Firebase popups
  },
});