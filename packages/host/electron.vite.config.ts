import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Three build contexts mapped to our dir layout: electron/ (main), preload/, src/ (renderer). / 三套构建上下文映射到目录:electron/(main)、preload/、src/(renderer)
// `@isle/protocol` is excluded from externalization so its (ESM) code is bundled into main/preload — no CJS/ESM runtime clash. / 协议包排除外置,打进 main/preload,避免 CJS/ESM 运行时冲突
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@isle/protocol'] })],
    build: {
      outDir: 'dist-electron/main',
      lib: { entry: resolve(__dirname, 'electron/main.ts') },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@isle/protocol'] })],
    build: {
      outDir: 'dist-electron/preload',
      lib: { entry: resolve(__dirname, 'preload/preload.ts') },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    plugins: [react()],
    build: {
      outDir: resolve(__dirname, 'dist-electron/renderer'),
      rollupOptions: { input: resolve(__dirname, 'src/index.html') },
    },
  },
});
