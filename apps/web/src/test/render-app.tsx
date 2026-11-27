import type { AccessInfo, MeResponse } from '@notamotors/shared';
import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { createQueryClient } from '../api/query-client';
import { App } from '../app';
import { routes } from '../routes';

type Reply = { status: number; body?: unknown };
type Handler = (body: unknown) => Reply;

/**
 * Simula a API: cada chave é "MÉTODO /caminho". Chamada sem handler falha o teste.
 * Retorna a lista de chamadas feitas, para conferir o que foi enviado.
 */
export function mockApi(handlers: Record<string, Handler | Reply>) {
  const calls: { key: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url.replace(/^\/api/, '')}`;
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ key, body });
      const handler = handlers[key];
      if (!handler) throw new Error(`Chamada inesperada à API: ${key}`);
      const reply = typeof handler === 'function' ? handler(body) : handler;
      return new Response(reply.status === 204 ? null : JSON.stringify(reply.body ?? {}), {
        status: reply.status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App router={router} queryClient={createQueryClient()} />);
  return router;
}

export function fakeMe(access: Partial<AccessInfo> = {}): MeResponse {
  return {
    user: { id: 'u1', name: 'Maria Teste', email: 'maria@exemplo.test' },
    store: { id: 's1', name: 'Auto Teste' },
    role: 'owner',
    access: {
      status: 'trial',
      allowed: true,
      reason: null,
      trialEndsAt: '2026-12-11T00:00:00.000Z',
      trialDaysLeft: 14,
      ...access,
    },
  };
}

export const BLOCKED: Partial<AccessInfo> = {
  status: 'blocked',
  allowed: false,
  reason: 'trial_expired',
  trialDaysLeft: 0,
};

export const STORE = {
  id: 's1',
  name: 'Auto Teste',
  fiscalStatus: 'incomplete',
  cnpj: null,
  uf: null,
};
