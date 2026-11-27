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
