import type { MeResponse } from '@notamotors/shared';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMe } from './use-me';

function Loading() {
  return (
    <div className="page-center" role="status">
      Carregando…
    </div>
  );
}

function LoadError({ retry }: { retry: () => void }) {
  return (
    <div className="page-center">
      <p>Não foi possível carregar sua conta.</p>
      <button type="button" className="button" onClick={retry}>
        Tentar de novo
      </button>
    </div>
  );
}

/** Exige login. */
export function RequireSession({ children }: { children: (me: MeResponse) => ReactNode }) {
  const location = useLocation();
  const { data: me, isPending, isError, refetch } = useMe();
  if (isPending) return <Loading />;
  if (isError) return <LoadError retry={() => void refetch()} />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children(me)}</>;
}

/** Exige login e acesso liberado (teste, assinatura ou liberação manual). */
export function RequireAccess({ children }: { children: (me: MeResponse) => ReactNode }) {
  return (
    <RequireSession>
      {(me) => (me.access.allowed ? children(me) : <Navigate to="/checkout" replace />)}
    </RequireSession>
  );
}

/** Telas de visitante (login, cadastro): quem já está logado vai para o app. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useMe();
  if (isPending) return <Loading />;
  if (me) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
