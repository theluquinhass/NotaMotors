import { formatCnpj, type SignupResponse, type StoreFiscalResponse } from '@notamotors/shared';
import argon2 from 'argon2';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Browser, fakeCnpj, fakeSignup, startApi, type TestApi } from '../../test/http.js';
import { createDatabase, type Database } from '../db/client.js';
import { memberships, storeTaxRegimes, stores, users } from '../db/schema/index.js';

interface ErrorBody {
  message: string;
  fields?: Record<string, string[]>;
}

describe('store fiscal data (CNPJ, IE, UF, regime)', () => {
  let api: TestApi;
  let admin: Database;

  beforeAll(async () => {
    api = await startApi();
    admin = createDatabase(process.env.DATABASE_ADMIN_URL ?? '');
  });

  afterAll(async () => {
    await api.close();
    await admin.$client.end();
  });

  async function owner() {
    const browser = new Browser(api.baseUrl);
    const res = await browser.post('/auth/signup', fakeSignup());
    const { storeId } = (await res.json()) as SignupResponse;
    return { browser, storeId };
  }

  async function validInput(overrides: Record<string, unknown> = {}) {
    return {
      cnpj: formatCnpj(await fakeCnpj()), // com pontuação, como o usuário digita
      stateRegistration: '123.456.789.110',
      uf: 'SP',
      regime: 'simples',
      regimeValidFrom: '2026-01-01',
      ...overrides,
    };
  }

  const put = (browser: Browser, body: unknown) =>
    browser.request('PUT', '/stores/current/fiscal', body);

  it('starts empty, with nothing in the checklist', async () => {
    const { browser } = await owner();
    const res = await browser.get('/stores/current/fiscal');
    expect(res.status).toBe(200);
    const fiscal = (await res.json()) as StoreFiscalResponse;
    expect(fiscal).toMatchObject({ cnpj: null, stateRegistration: null, uf: null, regime: null });
    expect(fiscal.checklist).toEqual({
      cnpj: false,
      stateRegistration: false,
      regime: false,
      certificate: false,
    });
  });

  it('owner saves CNPJ, IE, UF and regime; values are normalized', async () => {
    const { browser, storeId } = await owner();
    const input = await validInput();

    const res = await put(browser, input);
    expect(res.status).toBe(200);
    const fiscal = (await res.json()) as StoreFiscalResponse;

    expect(fiscal.cnpj).toBe(input.cnpj.replace(/[.\-/]/g, ''));
    expect(fiscal.stateRegistration).toBe('123456789110');
    expect(fiscal.uf).toBe('SP');
    expect(fiscal.regime).toEqual({ regime: 'simples', validFrom: '2026-01-01' });
    expect(fiscal.checklist).toEqual({
      cnpj: true,
      stateRegistration: true,
      regime: true,
      certificate: false,
    });
    // Sem certificado, a loja continua sem poder emitir nota.
    expect(fiscal.fiscalStatus).toBe('incomplete');

    const [row] = await admin.select().from(stores).where(eq(stores.id, storeId));
    expect(row!.cnpj).toBe(fiscal.cnpj);
  });

  it('changing the regime closes the previous period on the new start date', async () => {
    const { browser, storeId } = await owner();
    const input = await validInput();
    await put(browser, input);

    const res = await put(browser, { ...input, regime: 'regular', regimeValidFrom: '2027-01-01' });
    expect(res.status).toBe(200);
    expect(((await res.json()) as StoreFiscalResponse).regime).toEqual({
      regime: 'regular',
      validFrom: '2027-01-01',
    });

    const history = await admin
      .select({
        regime: storeTaxRegimes.regime,
        validFrom: storeTaxRegimes.validFrom,
        validTo: storeTaxRegimes.validTo,
      })
      .from(storeTaxRegimes)
      .where(eq(storeTaxRegimes.storeId, storeId))
      .orderBy(asc(storeTaxRegimes.validFrom));
    expect(history).toEqual([
      { regime: 'simples', validFrom: '2026-01-01', validTo: '2027-01-01' },
      { regime: 'regular', validFrom: '2027-01-01', validTo: null },
    ]);
  });

  it('saving again with the same regime does not create a new period', async () => {
    const { browser, storeId } = await owner();
    const input = await validInput();
    await put(browser, input);
    await put(browser, { ...input, stateRegistration: '999888777' });

    const history = await admin
      .select()
      .from(storeTaxRegimes)
      .where(eq(storeTaxRegimes.storeId, storeId));
    expect(history).toHaveLength(1);
  });

  it('a regime change cannot start before the current one', async () => {
    const { browser } = await owner();
    const input = await validInput({ regimeValidFrom: '2026-06-01' });
    await put(browser, input);

    const res = await put(browser, { ...input, regime: 'regular', regimeValidFrom: '2026-05-01' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ErrorBody).fields?.regimeValidFrom?.[0]).toContain('01/06/2026');
  });

  it('rejects an invalid CNPJ check digit with a Portuguese message', async () => {
    const { browser } = await owner();
    const res = await put(browser, await validInput({ cnpj: '12.ABC.345/01DE-36' }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as ErrorBody).fields?.cnpj).toEqual([
      'CNPJ inválido: confira os números e letras',
    ]);
  });

  it('rejects a CNPJ already used by another store', async () => {
    const first = await owner();
    const input = await validInput();
    expect((await put(first.browser, input)).status).toBe(200);

    const second = await owner();
    const res = await put(second.browser, await validInput({ cnpj: input.cnpj }));
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrorBody).message).toBe(
      'Este CNPJ já está cadastrado em outra loja do NotaMotors',
    );
  });

  it('a seller can read but cannot change fiscal data', async () => {
    const { storeId } = await owner();
    // Vendedor criado direto no banco (ainda não há convite de equipe).
    const email = `vendedor-${crypto.randomUUID()}@exemplo.test`;
    const [seller] = await admin
      .insert(users)
      .values({ name: 'Vendedor', email, passwordHash: await argon2.hash('senha-forte-123') })
      .returning();
    await admin.insert(memberships).values({ storeId, userId: seller!.id, role: 'seller' });

    const browser = new Browser(api.baseUrl);
    expect((await browser.post('/auth/login', { email, password: 'senha-forte-123' })).status).toBe(
      200,
    );

    expect((await browser.get('/stores/current/fiscal')).status).toBe(200);
    const res = await put(browser, await validInput());
    expect(res.status).toBe(403);
    expect(((await res.json()) as ErrorBody).message).toBe(
      'Só o dono da loja pode alterar os dados fiscais',
    );
  });

  it("only changes the logged-in store, never another store's data", async () => {
    const a = await owner();
    const b = await owner();
    await put(a.browser, await validInput());

    const [rowB] = await admin.select().from(stores).where(eq(stores.id, b.storeId));
    expect(rowB).toMatchObject({ cnpj: null, stateRegistration: null, uf: null });
  });

  it('requires login and an active trial or subscription', async () => {
    expect((await new Browser(api.baseUrl).get('/stores/current/fiscal')).status).toBe(401);
  });
});
