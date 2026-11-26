import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from './client.js';
import {
  asPgError,
  PG_CHECK_VIOLATION,
  PG_EXCLUSION_VIOLATION,
  PG_UNIQUE_VIOLATION,
  type PgError,
} from './errors.js';
import { storeTaxRegimes, stores, users } from './schema/index.js';

async function pgErrorOf(promise: Promise<unknown>): Promise<PgError> {
  try {
    await promise;
  } catch (error) {
    return asPgError(error);
  }
  throw new Error('Esperava um erro do banco, mas a operação passou');
}

describe('database schema constraints', () => {
  let db: Database;

  beforeAll(() => {
    db = createDatabase(process.env.DATABASE_URL ?? '');
  });

  afterAll(async () => {
    await db.$client.end();
  });

  async function newStore(): Promise<string> {
    const [store] = await db.insert(stores).values({ name: 'Loja Teste' }).returning();
    return store!.id;
  }

  it('generates time-ordered UUID v7 ids', async () => {
    const id = await newStore();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
  });

  describe('store_tax_regimes', () => {
    it('accepts consecutive periods (valid_to is exclusive)', async () => {
      const storeId = await newStore();
      await db.insert(storeTaxRegimes).values([
        { storeId, regime: 'simples', validFrom: '2026-01-01', validTo: '2027-01-01' },
        { storeId, regime: 'regular', validFrom: '2027-01-01' },
      ]);
    });

    it('rejects overlapping periods for the same store', async () => {
      const storeId = await newStore();
      await db
        .insert(storeTaxRegimes)
        .values({ storeId, regime: 'simples', validFrom: '2026-01-01' });

      const err = await pgErrorOf(
        db.insert(storeTaxRegimes).values({ storeId, regime: 'regular', validFrom: '2026-06-01' }),
      );
      expect(err.code).toBe(PG_EXCLUSION_VIOLATION);
      expect(err.constraint).toBe('store_tax_regimes_no_overlap_ex');
    });

    it('allows the same period in different stores', async () => {
      const [a, b] = [await newStore(), await newStore()];
      await db.insert(storeTaxRegimes).values([
        { storeId: a, regime: 'simples', validFrom: '2026-01-01' },
        { storeId: b, regime: 'regular', validFrom: '2026-01-01' },
      ]);
    });

    it('rejects a period that ends before it starts', async () => {
      const storeId = await newStore();
      const err = await pgErrorOf(
        db
          .insert(storeTaxRegimes)
          .values({ storeId, regime: 'simples', validFrom: '2026-06-01', validTo: '2026-01-01' }),
      );
      expect(err.code).toBe(PG_CHECK_VIOLATION);
    });
  });

  describe('stores', () => {
    it('accepts an alphanumeric CNPJ and rejects a formatted one', async () => {
      // Formato apenas (dígito verificador é validado na aplicação). Valor fictício.
      await db.insert(stores).values({ name: 'Loja Alfa', cnpj: '12ABC34501DE35' });

      const err = await pgErrorOf(
        db.insert(stores).values({ name: 'Loja Beta', cnpj: '12.ABC.345/01DE-35' }),
      );
      expect(err.code).toBe(PG_CHECK_VIOLATION);
    });
  });

  describe('users', () => {
    it('treats e-mails as case-insensitive unique', async () => {
      const email = `pessoa-${randomUUID()}@exemplo.test`;
      await db.insert(users).values({ name: 'Pessoa', email, passwordHash: 'x' });

      const err = await pgErrorOf(
        db.insert(users).values({ name: 'Outra', email: email.toUpperCase(), passwordHash: 'x' }),
      );
      expect(err.code).toBe(PG_UNIQUE_VIOLATION);
    });
  });
});
