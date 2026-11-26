import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

const conditions = ['@notamotors/source', ...defaultServerConditions];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: { include: ['src/**/*.test.ts'] },
});
