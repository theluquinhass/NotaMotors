import { useQuery } from '@tanstack/react-query';
import type { MeResponse } from '@notamotors/shared';
import { api, ApiError } from '../api/client';

export const ME_KEY = ['me'] as const;

/** Quem está logado (ou null). A situação de acesso vem calculada pelo servidor. */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<MeResponse | null> => {
      try {
        return await api<MeResponse>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
}
