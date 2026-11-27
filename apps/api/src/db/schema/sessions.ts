import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { stores } from './stores.js';
import { users } from './users.js';

/**
 * Sessão de login. O token aleatório só existe no cookie do navegador;
 * aqui fica apenas o hash SHA-256 dele. Revogar = preencher revoked_at.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    // Loja ativa nesta sessão (hoje o usuário tem uma só).
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    tokenHash: text('token_hash').notNull().unique('sessions_token_hash_uq'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);
