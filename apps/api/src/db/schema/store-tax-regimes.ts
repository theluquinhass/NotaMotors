import { sql } from 'drizzle-orm';
import { check, date, pgTable, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { taxRegime } from './enums.js';
import { stores } from './stores.js';
import { users } from './users.js';

/**
 * Regime tributário da loja com vigência. valid_to é exclusivo e nulo enquanto vigente.
 * A proibição de períodos sobrepostos fica numa migração SQL própria (EXCLUDE com btree_gist),
 * porque o Drizzle não gera esse tipo de constraint.
 */
export const storeTaxRegimes = pgTable(
  'store_tax_regimes',
  {
    id: id(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    regime: taxRegime('regime').notNull(),
    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to'),
    createdBy: uuid('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    check(
      'store_tax_regimes_period_ck',
      sql`${t.validTo} is null or ${t.validTo} > ${t.validFrom}`,
    ),
  ],
);
