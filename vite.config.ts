import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 의존성 변경 후 "504 Outdated Optimize Dep" 완화: yaml을 명시적으로 사전 번들링
    include: ['yaml'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  ssr: {
    noExternal: ['react-helmet-async'],
  },
});
