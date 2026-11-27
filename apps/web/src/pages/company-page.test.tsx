import type { StoreFiscalResponse } from '@notamotors/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeMe, mockApi, renderApp } from '../test/render-app';

afterEach(() => {
  vi.unstubAllGlobals();
});

const EMPTY: StoreFiscalResponse = {
  id: 's1',
  name: 'Auto Teste',
  cnpj: null,
  stateRegistration: null,
  uf: null,
  fiscalStatus: 'incomplete',
  regime: null,
  checklist: { cnpj: false, stateRegistration: false, regime: false, certificate: false },
};

const FILLED: StoreFiscalResponse = {
  ...EMPTY,
  cnpj: '12ABC34501DE35',
  stateRegistration: '123456789110',
  uf: 'SP',
  regime: { regime: 'simples', validFrom: '2026-01-01' },
  checklist: { cnpj: true, stateRegistration: true, regime: true, certificate: false },
};

/** Texto do item da lista "Para emitir nota fiscal". */
function checklistItem(label: string): string {
  const li = screen.getAllByRole('listitem').find((el) => el.textContent?.includes(label));
  return li?.textContent ?? '';
}

function fill(label: string, value: string) {
  const el = screen.getByLabelText(label);
  fireEvent.input(el, { target: { value } });
  fireEvent.change(el, { target: { value } });
}

describe('company page', () => {
  it('owner fills and saves the fiscal data; the checklist updates', async () => {
    const calls = mockApi({
      'GET /auth/me': { status: 200, body: fakeMe() },
      'GET /stores/current/fiscal': { status: 200, body: EMPTY },
      'PUT /stores/current/fiscal': { status: 200, body: FILLED },
    });
    renderApp('/app/empresa');
    await screen.findByLabelText('CNPJ');
    expect(checklistItem('CNPJ')).toContain('(pendente)');

    fill('CNPJ', '12.abc.345/01de-35');
    fill('Inscrição estadual', '123.456.789.110');
    fill('Estado (UF)', 'SP');
    fill('Regime tributário', 'simples');
    fill('Neste regime desde', '2026-01-01');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Dados salvos.')).toBeTruthy();
    expect(calls.find((c) => c.key === 'PUT /stores/current/fiscal')?.body).toEqual({
      cnpj: '12ABC34501DE35',
      stateRegistration: '123456789110',
      uf: 'SP',
      regime: 'simples',
      regimeValidFrom: '2026-01-01',
    });
    expect(checklistItem('CNPJ')).toContain('(preenchido)');
    expect(checklistItem('Certificado digital')).toContain('(pendente)');
  });

  it('shows saved data formatted', async () => {
    mockApi({
      'GET /auth/me': { status: 200, body: fakeMe() },
      'GET /stores/current/fiscal': { status: 200, body: FILLED },
    });
    renderApp('/app/empresa');
    await waitFor(() =>
      expect((screen.getByLabelText('CNPJ') as HTMLInputElement).value).toBe('12.ABC.345/01DE-35'),
    );
  });

  it('checks the CNPJ digit before calling the API', async () => {
    const calls = mockApi({
      'GET /auth/me': { status: 200, body: fakeMe() },
      'GET /stores/current/fiscal': { status: 200, body: EMPTY },
    });
    renderApp('/app/empresa');
    await screen.findByLabelText('CNPJ');

    fill('CNPJ', '12.ABC.345/01DE-36');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('CNPJ inválido: confira os números e letras')).toBeTruthy();
    expect(calls.some((c) => c.key === 'PUT /stores/current/fiscal')).toBe(false);
  });

  it('shows a CNPJ already in use on the CNPJ field', async () => {
    mockApi({
      'GET /auth/me': { status: 200, body: fakeMe() },
      'GET /stores/current/fiscal': { status: 200, body: FILLED },
      'PUT /stores/current/fiscal': {
        status: 409,
        body: { message: 'Este CNPJ já está cadastrado em outra loja do NotaMotors' },
      },
    });
    renderApp('/app/empresa');
    await waitFor(() =>
      expect((screen.getByLabelText('CNPJ') as HTMLInputElement).value).not.toBe(''),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Este CNPJ já está cadastrado em outra loja do NotaMotors'),
    ).toBeTruthy();
    expect(screen.getByLabelText('CNPJ').getAttribute('aria-invalid')).toBe('true');
  });

  it('a seller sees the data but cannot edit', async () => {
    mockApi({
      'GET /auth/me': { status: 200, body: { ...fakeMe(), role: 'seller' } },
      'GET /stores/current/fiscal': { status: 200, body: FILLED },
    });
    renderApp('/app/empresa');
    expect(await screen.findByText('Só o dono da loja pode alterar estes dados.')).toBeTruthy();
    // Campo dentro de <fieldset disabled>: desativado para o usuário.
    expect(screen.getByLabelText('CNPJ').closest('fieldset')?.disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
  });
});
