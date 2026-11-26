import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema> & { $client: pg.Pool };

export function createDatabase(url: string): Database {
  const pool = new pg.Pool({ connectionString: url });
  return drizzle(pool, { schema });
}
