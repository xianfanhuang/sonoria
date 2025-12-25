// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// 核心：明确输出目录为 dist，且清空旧产物
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist'), // 绝对路径避免路径解析问题
    emptyOutDir: true, // 每次构建清空 dist
    sourcemap: false, // 生产环境关闭 sourcemap 减小产物体积
  },
  // 可选：如果是路由应用，需配置 base（适配 gh-pages 路径）
  base: '/sonoria/',
});