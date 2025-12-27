import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    // 大型依赖保持外部引用
    'discord.js',
    '@slack/bolt',
    'node-pty',
    'grammy',
  ],
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
      '@shared': './src/shared',
      '@core': './src/core',
      '@orchestrator': './src/orchestrator',
      '@api': './src/api',
      '@cli': './src/cli',
      '@adapters': './src/adapters',
    }
  },
})
