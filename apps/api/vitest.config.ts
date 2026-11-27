import swc from 'unplugin-swc';
import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

try {
  process.loadEnvFile('../../.env');
} catch {
  // Sem .env: usa as variáveis do ambiente (CI).
}

const conditions = ['@notamotors/source', ...defaultServerConditions];

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: {
      // A API nos testes usa o papel sem privilégios, como em produção.
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? '',
      // Consultas de conferência dos testes usam o dono das tabelas (ignora o RLS).
      DATABASE_ADMIN_URL: process.env.DATABASE_ADMIN_URL_TEST ?? '',
    },
  },
});
