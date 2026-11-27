import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Browser, fakeSignup, startApi, type TestApi } from '../../test/http.js';
import { createDatabase, type Database } from './client.js';
import { asPgError } from './errors.js';
import { memberships, parties, storeTaxRegimes, stores, subscriptions } from './schema/index.js';
import { withTenant } from './tenant.js';

const PG_INSUFFICIENT_PRIVILEGE = '42501';

/**
 * Teste modelo de isolamento entre lojas. Todo recurso novo da loja ganha um bloco aqui
 * (ou um teste igual no próprio módulo): a loja A não lê, não altera e não grava na loja B.
 *
 * Roda com o mesmo papel de banco da API (notamotors_app), sujeito ao RLS.
 */
describe('tenant isolation (RLS)', () => {
  let api: TestApi;
  let app: Database; // papel da API
  let storeA: string;
  let storeB: string;
  let userA: string;

  beforeAll(async () => {
    api = await startApi();
    app = createDatabase(process.env.DATABASE_URL ?? '');

    const signup = async () => {
      const res = await new Browser(api.baseUrl).post('/auth/signup', fakeSignup());
      return (await res.json()) as { storeId: string; userId: string };
    };
    ({ storeId: storeA, userId: userA } = await signup());
    ({ storeId: storeB } = await signup());

    // Um regime e uma pessoa em cada loja, gravados pelo próprio papel da API com o contexto certo.
    for (const storeId of [storeA, storeB]) {
      await withTenant(app, { storeId }, async (tx) => {
        await tx
          .insert(storeTaxRegimes)
          .values({ storeId, regime: 'simples', validFrom: '2026-01-01' });
        await tx.insert(parties).values({ storeId, kind: 'person', name: 'Pessoa fictícia' });
      });
    }
  });

  afterAll(async () => {
    await api.close();
    await app.$client.end();
  });

  const asA = <T>(fn: Parameters<typeof withTenant<T>>[2]) =>
    withTenant(app, { storeId: storeA, userId: userA }, fn);

  it('the API connects with a role that is not superuser and cannot bypass RLS', async () => {
    const { rows } = await app.execute<{ rolsuper: boolean; rolbypassrls: boolean }>(
      sql`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
    );
    expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });

  it('without a store in context, no store data is visible (fails closed)', async () => {
    await withTenant(app, {}, async (tx) => {
      expect(await tx.select().from(stores)).toEqual([]);
      expect(await tx.select().from(subscriptions)).toEqual([]);
      expect(await tx.select().from(storeTaxRegimes)).toEqual([]);
      expect(await tx.select().from(memberships)).toEqual([]);
      expect(await tx.select().from(parties)).toEqual([]);
    });
    // Fora de transação nenhuma, também nada.
    expect(await app.select().from(stores)).toEqual([]);
  });

  it('store A reads only its own rows', async () => {
    await asA(async (tx) => {
      expect((await tx.select().from(stores)).map((r) => r.id)).toEqual([storeA]);
      expect((await tx.select().from(subscriptions)).map((r) => r.storeId)).toEqual([storeA]);
      expect((await tx.select().from(storeTaxRegimes)).map((r) => r.storeId)).toEqual([storeA]);
      expect((await tx.select().from(memberships)).map((r) => r.storeId)).toEqual([storeA]);
      expect((await tx.select().from(parties)).map((r) => r.storeId)).toEqual([storeA]);
    });
  });

  it('store A cannot read store B even when asking for it by id', async () => {
    await asA(async (tx) => {
      expect(await tx.select().from(stores).where(eq(stores.id, storeB))).toEqual([]);
      expect(
        await tx.select().from(subscriptions).where(eq(subscriptions.storeId, storeB)),
      ).toEqual([]);
    });
  });

  it('store A cannot update or delete store B rows', async () => {
    await asA(async (tx) => {
      const updated = await tx
        .update(subscriptions)
        .set({ manualGrant: true })
        .where(eq(subscriptions.storeId, storeB))
        .returning();
      expect(updated).toEqual([]);

      const renamed = await tx
        .update(stores)
        .set({ name: 'Invadida' })
        .where(eq(stores.id, storeB))
        .returning();
      expect(renamed).toEqual([]);

      const deleted = await tx
        .delete(storeTaxRegimes)
        .where(eq(storeTaxRegimes.storeId, storeB))
        .returning();
      expect(deleted).toEqual([]);
    });
  });

  it('store A cannot insert rows for store B', async () => {
    let error: unknown;
    try {
      await asA((tx) =>
        tx
          .insert(storeTaxRegimes)
          .values({ storeId: storeB, regime: 'regular', validFrom: '2030-01-01' }),
      );
    } catch (e) {
      error = e;
    }
    expect(asPgError(error).code).toBe(PG_INSUFFICIENT_PRIVILEGE);
  });

  it('store A cannot insert people into store B', async () => {
    let error: unknown;
    try {
      await asA((tx) => tx.insert(parties).values({ storeId: storeB, kind: 'person', name: 'X' }));
    } catch (e) {
      error = e;
    }
    expect(asPgError(error).code).toBe(PG_INSUFFICIENT_PRIVILEGE);
  });

  it('store A cannot add itself to store B', async () => {
    let error: unknown;
    try {
      await asA((tx) =>
        tx.insert(memberships).values({ storeId: storeB, userId: userA, role: 'owner' }),
      );
    } catch (e) {
      error = e;
    }
    expect(asPgError(error).code).toBe(PG_INSUFFICIENT_PRIVILEGE);
  });

  it('the store context does not leak to the next transaction on the same pool', async () => {
    await asA(async (tx) => expect(await tx.select().from(stores)).toHaveLength(1));
    // Força reaproveitar conexões do pool sem contexto.
    for (let i = 0; i < 5; i++) {
      expect(await app.select().from(stores)).toEqual([]);
    }
  });

  it('the API role cannot change the schema', async () => {
    let error: unknown;
    try {
      await app.execute(sql`alter table stores disable row level security`);
    } catch (e) {
      error = e;
    }
    expect(asPgError(error).code).toBe(PG_INSUFFICIENT_PRIVILEGE);
  });
});
