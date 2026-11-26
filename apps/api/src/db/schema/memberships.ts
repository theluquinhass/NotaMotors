import { index, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { membershipRole } from './enums.js';
import { stores } from './stores.js';
import { users } from './users.js';

/** Papel de um usuário em uma loja. */
export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: membershipRole('role').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    unique('memberships_store_user_uq').on(t.storeId, t.userId),
    index('memberships_user_idx').on(t.userId),
  ],
);
