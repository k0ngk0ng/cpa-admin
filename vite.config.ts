import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import { execSync } from 'child_process';

function getVersion(): string {
  // 优先使用环境变量
  if (process.env.VERSION) {
    return process.env.VERSION;
  }

  try {
    // 尝试获取 git tag
    const tag = execSync('git describe --tags --exact-match 2>/dev/null', { encoding: 'utf8' }).trim();
    if (tag) {
      return tag;
    }
  } catch {
    // 没有 tag，继续尝试获取 commit
  }

  try {
    // 获取短 commit hash
    const commit = execSync('git rev-parse --short HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
    if (commit) {
      return commit;
    }
  } catch {
    // git 不可用
  }

  return 'dev';
}

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile({
      removeViteModuleLoader: true
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(getVersion())
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`
      }
    }
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined
      }
    }
  }
});
