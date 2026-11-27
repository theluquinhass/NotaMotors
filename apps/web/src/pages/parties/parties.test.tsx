import type { PartyListResponse, PartyResponse } from '@notamotors/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeMe, mockApi, renderApp } from '../../test/render-app';

afterEach(() => {
  vi.unstubAllGlobals();
});

const ME = { 'GET /auth/me': { status: 200, body: fakeMe() } };

function party(overrides: Partial<PartyResponse> = {}): PartyResponse {
  return {
    id: '01a21cdf-0000-7000-8000-000000000001',
    kind: 'person',
    document: '52998224725',
    name: 'José Teste',
    tradeName: null,
    isMei: false,
    companyTaxRegime: null,
    stateRegistration: null,
    email: null,
    phone: null,
    postalCode: null,
    street: null,
    number: null,
    complement: null,
    district: null,
    city: 'Campinas',
    cityIbgeCode: null,
    uf: 'SP',
    notes: null,
    createdAt: '2026-11-27T00:00:00.000Z',
    updatedAt: '2026-11-27T00:00:00.000Z',
    ...overrides,
  };
}

const list = (items: PartyResponse[], total = items.length): PartyListResponse => ({
  items,
  total,
  page: 1,
  pageSize: 20,
});

function fill(label: string, value: string) {
  const el = screen.getByLabelText(label);
  fireEvent.input(el, { target: { value } });
  fireEvent.change(el, { target: { value } });
}

describe('people list', () => {
  it('shows people with type, formatted document and city', async () => {
    mockApi({
      ...ME,
      'GET /parties?q=&page=1': {
        status: 200,
        body: list([
          party(),
          party({
            id: '01a21cdf-0000-7000-8000-000000000002',
            kind: 'company',
            document: '12ABC34501DE35',
            name: 'Oficina Ltda',
            tradeName: 'Oficina do Bairro',
            city: null,
          }),
        ]),
      },
    });
    renderApp('/app/pessoas');
    expect(await screen.findByText('José Teste')).toBeTruthy();
    expect(screen.getByText('Pessoa física · 529.982.247-25 · Campinas/SP')).toBeTruthy();
    expect(screen.getByText('Oficina do Bairro')).toBeTruthy();
    expect(screen.getByText('Pessoa jurídica · 12.ABC.345/01DE-35')).toBeTruthy();
  });

  it('shows an empty state and searches through the URL', async () => {
    mockApi({
      ...ME,
      'GET /parties?q=&page=1': { status: 200, body: list([]) },
      'GET /parties?q=maria&page=1': { status: 200, body: list([]) },
    });
    const router = renderApp('/app/pessoas');
    expect(await screen.findByText('Nenhuma pessoa cadastrada ainda.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar por nome ou CPF/CNPJ'), {
      target: { value: 'maria' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Ninguém encontrado para “maria”.')).toBeTruthy();
    expect(router.state.location.search).toBe('?q=maria');
  });

  it('paginates', async () => {
    mockApi({
      ...ME,
      'GET /parties?q=&page=1': { status: 200, body: list([party()], 41) },
      'GET /parties?q=&page=2': { status: 200, body: { ...list([party()], 41), page: 2 } },
    });
    renderApp('/app/pessoas');
    expect(await screen.findByText('Página 1 de 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByText('Página 2 de 3')).toBeTruthy();
  });
});

describe('person form', () => {
  it('creates a person and sends normalized data', async () => {
    const calls = mockApi({
      ...ME,
      'POST /parties': { status: 201, body: party() },
      'GET /parties?q=&page=1': { status: 200, body: list([party()]) },
    });
    const router = renderApp('/app/pessoas/nova');
    await screen.findByRole('heading', { name: 'Nova pessoa' });

    fill('Nome completo', 'José Teste');
    fill('CPF', '529.982.247-25');
    fill('CEP', '13010-000');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/app/pessoas'));
    const body = calls.find((c) => c.key === 'POST /parties')?.body as Record<string, unknown>;
    expect(body).toMatchObject({
      kind: 'person',
      name: 'José Teste',
      document: '52998224725',
      postalCode: '13010000',
      email: null,
      isMei: false,
    });
  });

  it('switching to company shows CNPJ, trade name, MEI and regime', async () => {
    mockApi(ME);
    renderApp('/app/pessoas/nova');
    await screen.findByRole('heading', { name: 'Nova pessoa' });
    expect(screen.queryByLabelText('Nome fantasia')).toBeNull();

    fireEvent.click(screen.getByLabelText('Pessoa jurídica (CNPJ)'));
    expect(await screen.findByLabelText('Nome fantasia')).toBeTruthy();
    expect(screen.getByLabelText('CNPJ')).toBeTruthy();
    expect(screen.getByLabelText('Regime tributário')).toBeTruthy();

    // MEI não tem regime para escolher.
    fireEvent.click(screen.getByLabelText(/É MEI/));
    await waitFor(() => expect(screen.queryByLabelText('Regime tributário')).toBeNull());
  });

  it('validates the CPF before calling the API', async () => {
    const calls = mockApi(ME);
    renderApp('/app/pessoas/nova');
    await screen.findByRole('heading', { name: 'Nova pessoa' });

    fill('Nome completo', 'José Teste');
    fill('CPF', '529.982.247-24');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('CPF inválido')).toBeTruthy();
    expect(calls.some((c) => c.key === 'POST /parties')).toBe(false);
  });

  it('shows a duplicate document on the document field', async () => {
    mockApi({
      ...ME,
      'POST /parties': {
        status: 409,
        body: { message: 'Já existe uma pessoa com este CPF/CNPJ nesta loja' },
      },
    });
    renderApp('/app/pessoas/nova');
    await screen.findByRole('heading', { name: 'Nova pessoa' });
    fill('Nome completo', 'José Teste');
    fill('CPF', '529.982.247-25');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Já existe uma pessoa com este CPF/CNPJ nesta loja'),
    ).toBeTruthy();
    expect(screen.getByLabelText('CPF').getAttribute('aria-invalid')).toBe('true');
  });

  it('loads an existing person for editing', async () => {
    const p = party({ phone: '(19) 90000-0000' });
    mockApi({ ...ME, [`GET /parties/${p.id}`]: { status: 200, body: p } });
    renderApp(`/app/pessoas/${p.id}`);
    expect(await screen.findByRole('heading', { name: 'Editar pessoa' })).toBeTruthy();
    await waitFor(() =>
      expect((screen.getByLabelText('CPF') as HTMLInputElement).value).toBe('529.982.247-25'),
    );
    expect((screen.getByLabelText('Telefone') as HTMLInputElement).value).toBe('(19) 90000-0000');
  });

  it('shows "not found" for a person from another store or a wrong id', async () => {
    mockApi({
      ...ME,
      'GET /parties/outro-id': { status: 404, body: { message: 'Pessoa não encontrada' } },
    });
    renderApp('/app/pessoas/outro-id');
    expect(await screen.findByRole('heading', { name: 'Pessoa não encontrada' })).toBeTruthy();
  });
});
