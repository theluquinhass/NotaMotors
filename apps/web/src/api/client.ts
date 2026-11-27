/** Erro de resposta da API, com o corpo JSON quando houver. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

export interface ApiErrorBody {
  message: string;
  code?: string;
  reason?: string;
  fields?: Record<string, string[] | undefined>;
}

const NETWORK_ERROR =
  'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.';

/** Chamada à API. O cookie de sessão vai junto automaticamente (mesmo domínio). */
export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, { message: NETWORK_ERROR });
  }

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const body = (data ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(res.status, {
      ...body,
      message: typeof body.message === 'string' ? body.message : 'Algo deu errado. Tente de novo.',
    });
  }
  return data as T;
}
