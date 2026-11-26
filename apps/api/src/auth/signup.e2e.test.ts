import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { TRIAL_DAYS, type SignupResponse } from '@notamotors/shared';
import argon2 from 'argon2';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDatabase, type Database } from '../db/client.js';
import { memberships, stores, subscriptions, users } from '../db/schema/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

interface ErrorBody {
  message: string;
  fields?: Record<string, string[]>;
}

describe('POST /api/auth/signup', () => {
  let app: INestApplication;
  let baseUrl: string;
  let db: Database;

  beforeAll(async () => {
    app = await createApp({ logger: false });
    await app.listen(0);
    baseUrl = `${await app.getUrl()}/api`.replace('[::1]', 'localhost');
    db = createDatabase(process.env.DATABASE_URL ?? '');
  });

  afterAll(async () => {
    await app.close();
    await db.$client.end();
  });

  // Dados fictícios (LGPD): e-mail e loja únicos por teste.
  function input(overrides: Record<string, unknown> = {}) {
    const tag = randomUUID();
    return {
      name: 'Pessoa Teste',
      email: `pessoa-${tag}@exemplo.test`,
      password: 'senha-forte-123',
      storeName: `Loja ${tag}`,
      ...overrides,
    };
  }

  function post(body: unknown) {
    return fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async function countStoresNamed(name: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(stores)
      .where(eq(stores.name, name));
    return row!.n;
  }

  it('creates user, store, owner membership and a 14-day trial in one go', async () => {
    const body = input({ email: '  Nova.Pessoa+X@Exemplo.TEST ' });
    const before = Date.now();

    const res = await post(body);
    expect(res.status).toBe(201);
    const json = (await res.json()) as SignupResponse;
    expect(Object.keys(json).sort()).toEqual(['storeId', 'trialEndsAt', 'userId']);

    const [user] = await db.select().from(users).where(eq(users.id, json.userId));
    expect(user!.email).toBe('nova.pessoa+x@exemplo.test');
    expect(user!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(user!.passwordHash, String(body.password))).toBe(true);

    const [store] = await db.select().from(stores).where(eq(stores.id, json.storeId));
    expect(store!.name).toBe(body.storeName);
    expect(store!.fiscalStatus).toBe('incomplete');
    expect(store!.cnpj).toBeNull();
    expect(store!.createdBy).toBe(json.userId);

    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.storeId, json.storeId));
    expect(membership).toMatchObject({ userId: json.userId, role: 'owner' });

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.storeId, json.storeId));
    expect(subscription).toMatchObject({ status: 'trialing', manualGrant: false });
    const trialEnds = subscription!.trialEndsAt.getTime();
    expect(trialEnds).toBeGreaterThanOrEqual(before + TRIAL_DAYS * DAY_MS - 60_000);
    expect(trialEnds).toBeLessThanOrEqual(Date.now() + TRIAL_DAYS * DAY_MS + 60_000);
    expect(new Date(json.trialEndsAt).getTime()).toBe(trialEnds);
  });

  it('rejects a repeated e-mail (any case) and leaves no orphan store behind', async () => {
    const first = input();
    expect((await post(first)).status).toBe(201);

    const second = input({ email: first.email.toUpperCase() });
    const res = await post(second);

    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrorBody).message).toBe('Este e-mail já está cadastrado');
    expect(await countStoresNamed(second.storeName)).toBe(0);
  });

  it('rejects invalid data with field messages in Portuguese and creates nothing', async () => {
    const body = input({ email: 'nao-e-email', password: '123' });
    const res = await post(body);

    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorBody;
    expect(json.message).toBe('Dados inválidos');
    expect(json.fields?.email).toEqual(['E-mail inválido']);
    expect(json.fields?.password).toEqual(['A senha precisa ter pelo menos 8 caracteres']);
    expect(await countStoresNamed(body.storeName)).toBe(0);
  });

  it('ignores fields the client is not allowed to set (e.g. trial or grant)', async () => {
    const body = input({ manualGrant: true, trialEndsAt: '2099-01-01T00:00:00Z', role: 'admin' });
    const res = await post(body);
    expect(res.status).toBe(201);
    const { storeId } = (await res.json()) as SignupResponse;

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.storeId, storeId));
    expect(subscription!.manualGrant).toBe(false);
    expect(subscription!.trialEndsAt.getUTCFullYear()).toBeLessThan(2099);
  });
});
