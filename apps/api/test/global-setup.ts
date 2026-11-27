import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';

/**
 * Antes dos testes: apaga e recria o banco de testes do zero e aplica todas as migrações.
 * Só roda contra DATABASE_ADMIN_URL_TEST, nunca contra o banco de desenvolvimento.
 */
export default async function setup(): Promise<void> {
  const url = process.env.DATABASE_ADMIN_URL_TEST;
  if (!url || !new URL(url).pathname.endsWith('_test')) {
    throw new Error('DATABASE_ADMIN_URL_TEST ausente ou não aponta para um banco *_test');
  }

  const db = createDatabase(url);
  try {
    await db.$client.query(
      'DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;',
    );
    await runMigrations(db);
  } finally {
    await db.$client.end();
  }
}
