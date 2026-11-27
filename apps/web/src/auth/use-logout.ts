import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../api/client';
import { ME_KEY } from './use-me';

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // Mesmo se a chamada falhar, a tela esquece a conta.
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, null);
      void navigate('/login', { replace: true });
    },
  });
}
