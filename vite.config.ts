import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  cacheDir: '.temp/vite',
  server: { port: 5173, open: false, watch: { ignored: ['**/.temp/**', '**/docs/**'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
  worker: { format: 'es' },
});
