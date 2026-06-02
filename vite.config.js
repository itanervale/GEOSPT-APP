import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Resolução robusta do alias '@' → /src, imune a espaços no caminho.
      // new URL('./src', import.meta.url) constrói o caminho relativo ao
      // próprio arquivo de config; fileURLToPath o converte de volta a um
      // caminho de sistema de arquivos, decodificando %20 etc. corretamente.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
