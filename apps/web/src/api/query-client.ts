import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ACCESS_BLOCKED } from '@notamotors/shared';
import { ApiError } from './client';
import { ME_KEY } from '../auth/use-me';

/**
 * Qualquer resposta 401 ou 402 atualiza o /auth/me; as proteções de rota
 * (RequireAccess) então levam para /login ou /checkout. Quem decide é sempre o servidor.
 */
export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
    queryCache: new QueryCache({ onError: (error) => handle(error) }),
    mutationCache: new MutationCache({ onError: (error) => handle(error) }),
  });

  function handle(error: unknown) {
    if (!(error instanceof ApiError)) return;
    if (error.status === 401) client.setQueryData(ME_KEY, null);
    if (error.status === 402 && error.body.code === ACCESS_BLOCKED) {
      void client.invalidateQueries({ queryKey: ME_KEY });
    }
  }

  return client;
}
