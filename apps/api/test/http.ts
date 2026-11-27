import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';

export interface TestApi {
  app: INestApplication;
  baseUrl: string;
  close(): Promise<void>;
}

/** Sobe a API de verdade numa porta livre, apontando para o banco de testes. */
export async function startApi(): Promise<TestApi> {
  const app = await createApp({ logger: false });
  await app.listen(0);
  const baseUrl = `${await app.getUrl()}/api`.replace('[::1]', 'localhost');
  return { app, baseUrl, close: () => app.close() };
}

/** Cliente HTTP que guarda o cookie de sessão, como um navegador. */
export class Browser {
  cookie?: string;

  constructor(private readonly baseUrl: string) {}

  async request(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.cookie) headers.cookie = this.cookie;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    for (const setCookie of res.headers.getSetCookie()) {
      const [pair] = setCookie.split(';');
      const value = pair!.slice(pair!.indexOf('=') + 1);
      this.cookie = value ? pair : undefined;
    }
    return res;
  }

  get(path: string) {
    return this.request('GET', path);
  }

  post(path: string, body?: unknown) {
    return this.request('POST', path, body);
  }
}

/** Dados fictícios (LGPD), únicos por chamada. */
export function fakeSignup(overrides: Record<string, unknown> = {}) {
  const tag = randomUUID();
  return {
    name: 'Pessoa Teste',
    email: `pessoa-${tag}@exemplo.test`,
    password: 'senha-forte-123',
    storeName: `Loja ${tag}`,
    ...overrides,
  };
}

/** CNPJ alfanumérico válido e aleatório (fictício), para não colidir entre testes. */
export async function fakeCnpj(): Promise<string> {
  const { cnpjCheckDigits } = await import('@notamotors/shared');
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let base = '';
  for (let i = 0; i < 12; i++) base += chars[Math.floor(Math.random() * chars.length)];
  return base + cnpjCheckDigits(base);
}

/** CPF válido e aleatório (fictício). */
export async function fakeCpf(): Promise<string> {
  const { cpfCheckDigits } = await import('@notamotors/shared');
  let base = '';
  for (let i = 0; i < 9; i++) base += Math.floor(Math.random() * 10);
  if (/^(.)\1{8}$/.test(base)) base = '123456789';
  return base + cpfCheckDigits(base);
}

/** Conta nova (dono) já logada. */
export async function signedUpOwner(baseUrl: string) {
  const browser = new Browser(baseUrl);
  const res = await browser.post('/auth/signup', fakeSignup());
  const { storeId, userId } = (await res.json()) as { storeId: string; userId: string };
  return { browser, storeId, userId };
}
