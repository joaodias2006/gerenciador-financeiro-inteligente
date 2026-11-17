import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { raioxApiVitePlugin } from './server/apiPlugin.js';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    raioxApiVitePlugin()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
