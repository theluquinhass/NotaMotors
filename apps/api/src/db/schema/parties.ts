import { sql } from 'drizzle-orm';
import { boolean, char, check, index, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { partyKind, taxRegime } from './enums.js';
import { stores } from './stores.js';
import { users } from './users.js';

/**
 * Pessoas da loja: clientes e fornecedores na mesma tabela (quem vende um carro na troca
 * também compra). O papel vem do uso (compra, venda, custo), não de uma marcação aqui.
 */
export const parties = pgTable(
  'parties',
  {
    id: id(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    kind: partyKind('kind').notNull(),
    // CPF (11 dígitos) ou CNPJ (alfanumérico), sem pontuação. Opcional no cadastro rápido;
    // compra e venda vão exigir.
    document: text('document'),
    name: text('name').notNull(), // nome completo ou razão social
    tradeName: text('trade_name'), // nome fantasia (PJ)
    isMei: boolean('is_mei').notNull().default(false),
    // Regime da PJ fornecedora: entra na cópia do tipo fiscal do vendedor na compra.
    companyTaxRegime: taxRegime('company_tax_regime'),
    stateRegistration: text('state_registration'),
    email: text('email'),
    phone: text('phone'),
    // Endereço (NF-e exige; código IBGE do município virá da busca por CEP).
    postalCode: char('postal_code', { length: 8 }),
    street: text('street'),
    number: text('number'),
    complement: text('complement'),
    district: text('district'),
    city: text('city'),
    cityIbgeCode: char('city_ibge_code', { length: 7 }),
    uf: char('uf', { length: 2 }),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    // Alvo das FKs compostas (store_id, id) das tabelas de compra e venda.
    unique('parties_store_id_uq').on(t.storeId, t.id),
    // Mesmo CPF/CNPJ não se repete na loja (pode existir em outra loja).
    unique('parties_store_document_uq').on(t.storeId, t.document),
    index('parties_store_name_idx').on(t.storeId, t.name),
    check(
      'parties_document_format_ck',
      sql`${t.document} is null
        or (${t.kind} = 'person' and ${t.document} ~ '^[0-9]{11}$')
        or (${t.kind} = 'company' and ${t.document} ~ '^[0-9A-Z]{12}[0-9]{2}$')`,
    ),
    check('parties_mei_company_ck', sql`not ${t.isMei} or ${t.kind} = 'company'`),
    check(
      'parties_regime_company_ck',
      sql`${t.companyTaxRegime} is null or (${t.kind} = 'company' and not ${t.isMei})`,
    ),
    check('parties_postal_code_ck', sql`${t.postalCode} ~ '^[0-9]{8}$'`),
    check('parties_city_ibge_ck', sql`${t.cityIbgeCode} ~ '^[0-9]{7}$'`),
    check('parties_uf_ck', sql`${t.uf} ~ '^[A-Z]{2}$'`),
  ],
);
