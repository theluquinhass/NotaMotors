import { formatCpf, type PartyListResponse, type PartyResponse } from '@notamotors/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fakeCnpj, fakeCpf, signedUpOwner, startApi, type TestApi } from '../../test/http.js';
import { createDatabase, type Database } from '../db/client.js';
import { parties } from '../db/schema/index.js';

interface ErrorBody {
  message: string;
  fields?: Record<string, string[]>;
}

describe('parties (customers and suppliers)', () => {
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

  // Dados fictícios (LGPD).
  async function person(overrides: Record<string, unknown> = {}) {
    return {
      kind: 'person',
      document: formatCpf(await fakeCpf()),
      name: 'José da Silva Teste',
      email: 'jose@exemplo.test',
      phone: '(11) 90000-0000',
      postalCode: '01310-100',
      street: 'Avenida Exemplo',
      number: '100',
      district: 'Centro',
      city: 'São Paulo',
      cityIbgeCode: '3550308',
      uf: 'SP',
      ...overrides,
    };
  }

  async function create(
    browser: Awaited<ReturnType<typeof signedUpOwner>>['browser'],
    body: unknown,
  ) {
    const res = await browser.post('/parties', body);
    return { res, json: (await res.json()) as PartyResponse & ErrorBody };
  }

  it('creates a person with normalized document and address', async () => {
    const { browser, storeId } = await signedUpOwner(api.baseUrl);
    const input = await person();
    const { res, json } = await create(browser, input);

    expect(res.status).toBe(201);
    expect(json).toMatchObject({
      kind: 'person',
      document: (input.document as string).replace(/\D/g, ''),
      name: 'José da Silva Teste',
      postalCode: '01310100',
      cityIbgeCode: '3550308',
      uf: 'SP',
      isMei: false,
    });
    expect(json).not.toHaveProperty('storeId');

    const [row] = await admin.select().from(parties).where(eq(parties.id, json.id));
    expect(row!.storeId).toBe(storeId);
  });

  it('creates a MEI supplier (company) and keeps its fiscal type', async () => {
    const { browser } = await signedUpOwner(api.baseUrl);
    const { res, json } = await create(browser, {
      kind: 'company',
      document: await fakeCnpj(),
      name: 'Oficina Teste ME',
      tradeName: 'Oficina do Teste',
      isMei: true,
    });
    expect(res.status).toBe(201);
    expect(json).toMatchObject({ kind: 'company', isMei: true, companyTaxRegime: null });
  });

  it('allows a quick registration without document', async () => {
    const { browser } = await signedUpOwner(api.baseUrl);
    const first = await create(browser, { kind: 'person', name: 'Cliente do balcão' });
    const second = await create(browser, { kind: 'person', name: 'Outro cliente' });
    expect([first.res.status, second.res.status]).toEqual([201, 201]);
    expect(first.json.document).toBeNull();
  });

  it('rejects an invalid CPF with a Portuguese message', async () => {
    const { browser } = await signedUpOwner(api.baseUrl);
    const { res, json } = await create(browser, await person({ document: '529.982.247-24' }));
    expect(res.status).toBe(400);
    expect(json.fields?.document).toEqual(['CPF inválido']);
  });

  it('rejects the same CPF twice in the same store, but allows it in another store', async () => {
    const a = await signedUpOwner(api.baseUrl);
    const input = await person();
    expect((await create(a.browser, input)).res.status).toBe(201);

    const again = await create(a.browser, input);
    expect(again.res.status).toBe(409);
    expect(again.json.message).toBe('Já existe uma pessoa com este CPF/CNPJ nesta loja');

    const b = await signedUpOwner(api.baseUrl);
    expect((await create(b.browser, input)).res.status).toBe(201);
  });

  it('updates a person', async () => {
    const { browser } = await signedUpOwner(api.baseUrl);
    const input = await person();
    const { json } = await create(browser, input);

    const res = await browser.request('PUT', `/parties/${json.id}`, {
      ...input,
      phone: '(11) 91111-1111',
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as PartyResponse).phone).toBe('(11) 91111-1111');
  });

  it('lists by name and searches by name or the start of the document', async () => {
    const { browser } = await signedUpOwner(api.baseUrl);
    const cpf = await fakeCpf();
    await create(browser, await person({ name: 'Bruna Compradora', document: cpf }));
    await create(browser, await person({ name: 'Alberto Vendedor' }));
    await create(browser, { kind: 'company', name: 'Carlos Oficina', tradeName: 'Funilaria 100%' });

    const all = (await (await browser.get('/parties')).json()) as PartyListResponse;
    expect(all.items.map((p) => p.name)).toEqual([
      'Alberto Vendedor',
      'Bruna Compradora',
      'Carlos Oficina',
    ]);
    expect(all.total).toBe(3);

    const byName = (await (await browser.get('/parties?q=bruna')).json()) as PartyListResponse;
    expect(byName.items.map((p) => p.name)).toEqual(['Bruna Compradora']);

    const byDoc = (await (
      await browser.get(`/parties?q=${encodeURIComponent(formatCpf(cpf).slice(0, 7))}`)
    ).json()) as PartyListResponse;
    expect(byDoc.items.map((p) => p.name)).toEqual(['Bruna Compradora']);

    // "%" digitado é literal, não curinga.
    const literal = (await (await browser.get('/parties?q=100%25')).json()) as PartyListResponse;
    expect(literal.items.map((p) => p.name)).toEqual(['Carlos Oficina']);
  });

  it('paginates 20 per page', async () => {
    const { browser } = await signedUpOwner(api.baseUrl);
    for (let i = 0; i < 21; i++) {
      await create(browser, { kind: 'person', name: `Pessoa ${String(i).padStart(2, '0')}` });
    }
    const page2 = (await (await browser.get('/parties?page=2')).json()) as PartyListResponse;
    expect(page2).toMatchObject({ total: 21, page: 2, pageSize: 20 });
    expect(page2.items.map((p) => p.name)).toEqual(['Pessoa 20']);
  });

  it('answers 404 for an unknown or malformed id', async () => {
    const { browser } = await signedUpOwner(api.baseUrl);
    expect((await browser.get('/parties/01a21cdf-8354-7899-b050-eac7627aff25')).status).toBe(404);
    expect((await browser.get('/parties/nao-e-um-id')).status).toBe(404);
  });

  describe('isolation between stores', () => {
    it('store B cannot list, read or update store A people', async () => {
      const a = await signedUpOwner(api.baseUrl);
      const b = await signedUpOwner(api.baseUrl);
      const { json: personA } = await create(a.browser, await person({ name: 'Só da loja A' }));

      const list = (await (await b.browser.get('/parties')).json()) as PartyListResponse;
      expect(list.items).toEqual([]);
      expect(list.total).toBe(0);

      expect((await b.browser.get(`/parties/${personA.id}`)).status).toBe(404);

      const put = await b.browser.request('PUT', `/parties/${personA.id}`, {
        kind: 'person',
        name: 'Alterado pela loja B',
      });
      expect(put.status).toBe(404);

      const [row] = await admin.select().from(parties).where(eq(parties.id, personA.id));
      expect(row!.name).toBe('Só da loja A');
    });
  });

  it('requires login', async () => {
    const res = await fetch(`${api.baseUrl}/parties`);
    expect(res.status).toBe(401);
  });
});
