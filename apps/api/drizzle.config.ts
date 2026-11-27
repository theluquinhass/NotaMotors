import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile('../../.env');
} catch {
  // Sem .env: usa as variáveis do ambiente (CI, produção).
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  // Migrações rodam como dono das tabelas; a API usa DATABASE_URL (sem privilégios).
  dbCredentials: { url: process.env.DATABASE_ADMIN_URL ?? '' },
  strict: true,
  verbose: true,
});
