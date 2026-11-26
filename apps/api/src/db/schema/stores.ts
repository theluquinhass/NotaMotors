import { sql } from 'drizzle-orm';
import { char, check, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { fiscalStatus } from './enums.js';
import { users } from './users.js';

/**
 * Loja = tenant = um CNPJ. O cadastro inicial pede só o nome;
 * os dados fiscais são preenchidos depois.
 */
export const stores = pgTable(
  'stores',
  {
    id: id(),
    name: text('name').notNull(),
    // CNPJ alfanumérico (IN RFB 2.229/2024): 12 caracteres [0-9A-Z] + 2 dígitos verificadores.
    // Guardado sem pontuação. O dígito verificador é validado na aplicação.
    cnpj: text('cnpj'),
    stateRegistration: text('state_registration'),
    uf: char('uf', { length: 2 }),
    fiscalStatus: fiscalStatus('fiscal_status').notNull().default('incomplete'),
    createdBy: uuid('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    unique('stores_cnpj_uq').on(t.cnpj),
    check('stores_cnpj_format_ck', sql`${t.cnpj} ~ '^[0-9A-Z]{12}[0-9]{2}$'`),
    check('stores_uf_format_ck', sql`${t.uf} ~ '^[A-Z]{2}$'`),
  ],
);
