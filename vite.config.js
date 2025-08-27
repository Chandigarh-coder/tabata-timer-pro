import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    allowedHosts: ['9d1d53c39708.ngrok-free.app', '.ngrok-free.app', 'localhost', '127.0.0.1'],
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: 3000
    }
  }
});
