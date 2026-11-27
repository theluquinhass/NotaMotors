import type { MeResponse } from '@notamotors/shared';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Browser, fakeSignup, startApi, type TestApi } from '../../test/http.js';
import { createDatabase, type Database } from '../db/client.js';
import { sessions } from '../db/schema/index.js';
import { hashToken } from './session.service.js';

describe('login and session', () => {
  let api: TestApi;
  let db: Database;

  beforeAll(async () => {
    api = await startApi();
    db = createDatabase(process.env.DATABASE_ADMIN_URL ?? '');
  });

  afterAll(async () => {
    await api.close();
    await db.$client.end();
  });

  /** Conta cadastrada e já deslogada. */
  async function registeredAccount() {
    const data = fakeSignup();
    const signup = new Browser(api.baseUrl);
    expect((await signup.post('/auth/signup', data)).status).toBe(201);
    return data;
  }

  function tokenOf(browser: Browser): string {
    return decodeURIComponent(browser.cookie!.split('=')[1]!);
  }

  it('signup already logs the user in', async () => {
    const browser = new Browser(api.baseUrl);
    const data = fakeSignup();
    await browser.post('/auth/signup', data);

    const res = await browser.get('/auth/me');
    expect(res.status).toBe(200);
    const me = (await res.json()) as MeResponse;
    expect(me.user.email).toBe(data.email);
    expect(me.store.name).toBe(data.storeName);
    expect(me.role).toBe('owner');
  });

  it('logs in with e-mail in any case and sets a hardened cookie', async () => {
    const data = await registeredAccount();
    const browser = new Browser(api.baseUrl);

    const res = await browser.post('/auth/login', {
      email: data.email.toUpperCase(),
      password: data.password,
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as MeResponse).store.name).toBe(data.storeName);

    const setCookie = res.headers.getSetCookie()[0]!;
    expect(setCookie).toMatch(/^nm_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Expires=/);

    expect((await browser.get('/auth/me')).status).toBe(200);
  });

  it('gives the same answer for wrong password and unknown e-mail', async () => {
    const data = await registeredAccount();
    const browser = new Browser(api.baseUrl);

    const wrongPassword = await browser.post('/auth/login', {
      email: data.email,
      password: 'senha-errada-123',
    });
    const unknownEmail = await browser.post('/auth/login', {
      email: 'ninguem@exemplo.test',
      password: 'senha-errada-123',
    });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(((await res.json()) as { message: string }).message).toBe(
        'E-mail ou senha incorretos',
      );
      expect(res.headers.getSetCookie()).toEqual([]);
    }
  });

  it('blocks protected routes without a session', async () => {
    const res = await new Browser(api.baseUrl).get('/auth/me');
    expect(res.status).toBe(401);
    expect(((await res.json()) as { message: string }).message).toBe('Faça login para continuar');
  });

  it('rejects a forged token', async () => {
    const browser = new Browser(api.baseUrl);
    browser.cookie = 'nm_session=token-inventado';
    expect((await browser.get('/auth/me')).status).toBe(401);
  });

  it('keeps health public', async () => {
    expect((await new Browser(api.baseUrl).get('/health')).status).toBe(200);
  });

  it('stores only the token hash, never the token itself', async () => {
    const browser = new Browser(api.baseUrl);
    await browser.post('/auth/signup', fakeSignup());
    const token = tokenOf(browser);

    const byToken = await db.select().from(sessions).where(eq(sessions.tokenHash, token));
    const byHash = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)));
    expect(byToken).toHaveLength(0);
    expect(byHash).toHaveLength(1);
  });

  it('logout revokes the session on the server, even if the old cookie is replayed', async () => {
    const browser = new Browser(api.baseUrl);
    await browser.post('/auth/signup', fakeSignup());
    const oldCookie = browser.cookie;

    expect((await browser.post('/auth/logout')).status).toBe(204);
    expect(browser.cookie).toBeUndefined();

    const replay = new Browser(api.baseUrl);
    replay.cookie = oldCookie;
    expect((await replay.get('/auth/me')).status).toBe(401);
  });

  it('rejects an expired session', async () => {
    const browser = new Browser(api.baseUrl);
    await browser.post('/auth/signup', fakeSignup());

    await db
      .update(sessions)
      .set({ expiresAt: sql`now() - interval '1 second'` })
      .where(eq(sessions.tokenHash, hashToken(tokenOf(browser))));

    expect((await browser.get('/auth/me')).status).toBe(401);
  });
});
