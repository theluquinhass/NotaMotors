import swc from 'unplugin-swc';
import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

const conditions = ['@notamotors/source', ...defaultServerConditions];

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: { include: ['src/**/*.test.ts'] },
});
