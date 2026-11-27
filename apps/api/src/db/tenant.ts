import { sql } from 'drizzle-orm';
import type { Database } from './client.js';

export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface TenantContext {
  storeId?: string;
  userId?: string;
}

/**
 * Define a loja e o usuário só para a transação atual (set_config com is_local = true).
 * O RLS do Postgres usa esses valores; ao terminar a transação eles somem,
 * então uma conexão reaproveitada do pool nunca carrega o contexto de outra requisição.
 */
export async function setTenant(tx: Tx, ctx: TenantContext): Promise<void> {
  await tx.execute(
    sql`select set_config('app.store_id', ${ctx.storeId ?? ''}, true),
               set_config('app.user_id', ${ctx.userId ?? ''}, true)`,
  );
}

/** Roda `fn` numa transação com o contexto da loja aplicado. Use em toda consulta de dados da loja. */
export function withTenant<T>(
  db: Database,
  ctx: TenantContext,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await setTenant(tx, ctx);
    return fn(tx);
  });
}
