import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // funciona no GitHub Pages em qualquer nome de repositório
  plugins: [react()],
  build: { chunkSizeWarningLimit: 900 },
});
