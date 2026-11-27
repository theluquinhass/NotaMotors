import {
  ACCESS_BLOCKED,
  type AccessBlockedError,
  type CurrentStoreResponse,
  type MeResponse,
  type SignupResponse,
} from '@notamotors/shared';
import { eq, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Browser, fakeSignup, startApi, type TestApi } from '../../test/http.js';
import { createDatabase, type Database } from '../db/client.js';
import { subscriptions } from '../db/schema/index.js';

describe('access guard (trial, subscription, manual grant)', () => {
  let api: TestApi;
  let admin: Database; // conferência e ajuste de datas nos testes (ignora o RLS)

  beforeAll(async () => {
    api = await startApi();
    admin = createDatabase(process.env.DATABASE_ADMIN_URL ?? '');
  });

  afterAll(async () => {
    await api.close();
    await admin.$client.end();
  });

  async function newStore() {
    const browser = new Browser(api.baseUrl);
    const res = await browser.post('/auth/signup', fakeSignup());
    const { storeId } = (await res.json()) as SignupResponse;
    return { browser, storeId };
  }

  function setSubscription(storeId: string, values: PgUpdateSetSource<typeof subscriptions>) {
    return admin.update(subscriptions).set(values).where(eq(subscriptions.storeId, storeId));
  }

  const expireTrial = (storeId: string) =>
    setSubscription(storeId, { trialEndsAt: sql`now() - interval '1 second'` });

  async function me(browser: Browser): Promise<MeResponse> {
    const res = await browser.get('/auth/me');
    expect(res.status).toBe(200);
    return (await res.json()) as MeResponse;
  }

  it('active trial: dashboard routes work and /auth/me shows 14 days left', async () => {
    const { browser, storeId } = await newStore();

    const res = await browser.get('/stores/current');
    expect(res.status).toBe(200);
    expect(((await res.json()) as CurrentStoreResponse).id).toBe(storeId);

    expect((await me(browser)).access).toMatchObject({
      status: 'trial',
      allowed: true,
      reason: null,
      trialDaysLeft: 14,
    });
  });

  it('expired trial: dashboard routes answer 402 ACCESS_BLOCKED', async () => {
    const { browser, storeId } = await newStore();
    await expireTrial(storeId);

    const res = await browser.get('/stores/current');
    expect(res.status).toBe(402);
    const body = (await res.json()) as AccessBlockedError;
    expect(body).toMatchObject({ code: ACCESS_BLOCKED, reason: 'trial_expired' });
    expect(body.message).toContain('teste grátis terminou');
  });

  it('expired trial: /auth/me and logout still work so the app can send the user to checkout', async () => {
    const { browser, storeId } = await newStore();
    await expireTrial(storeId);

    expect((await me(browser)).access).toMatchObject({
      status: 'blocked',
      allowed: false,
      reason: 'trial_expired',
      trialDaysLeft: 0,
    });
    expect((await browser.post('/auth/logout')).status).toBe(204);
  });

  it('expired trial keeps the data: access comes back when the store subscribes', async () => {
    const { browser, storeId } = await newStore();
    await expireTrial(storeId);
    expect((await browser.get('/stores/current')).status).toBe(402);

    await setSubscription(storeId, {
      status: 'active',
      currentPeriodEnd: sql`now() + interval '30 days'`,
    });

    const res = await browser.get('/stores/current');
    expect(res.status).toBe(200);
    expect(((await res.json()) as CurrentStoreResponse).id).toBe(storeId);
    expect((await me(browser)).access.status).toBe('active');
  });

  it('active subscription past its period: blocked', async () => {
    const { browser, storeId } = await newStore();
    await expireTrial(storeId);
    await setSubscription(storeId, {
      status: 'active',
      currentPeriodEnd: sql`now() - interval '1 second'`,
    });

    const res = await browser.get('/stores/current');
    expect(res.status).toBe(402);
    expect(((await res.json()) as AccessBlockedError).reason).toBe('period_ended');
  });

  it('manual grant (pilot store): allowed even with the trial expired', async () => {
    const { browser, storeId } = await newStore();
    await expireTrial(storeId);
    await setSubscription(storeId, { manualGrant: true });

    expect((await browser.get('/stores/current')).status).toBe(200);
    expect((await me(browser)).access.status).toBe('manual');
  });

  it('the access check happens on every request (no caching in the session)', async () => {
    const { browser, storeId } = await newStore();
    expect((await browser.get('/stores/current')).status).toBe(200);

    await expireTrial(storeId);
    expect((await browser.get('/stores/current')).status).toBe(402);
  });

  it('no session: 401 comes before any access check', async () => {
    const res = await new Browser(api.baseUrl).get('/stores/current');
    expect(res.status).toBe(401);
  });

  it('ignores the client clock: a forged Date header changes nothing', async () => {
    const { browser, storeId } = await newStore();
    await expireTrial(storeId);
    const res = await fetch(`${api.baseUrl}/stores/current`, {
      headers: { cookie: browser.cookie!, date: 'Mon, 01 Jan 2024 00:00:00 GMT' },
    });
    expect(res.status).toBe(402);
  });
});
