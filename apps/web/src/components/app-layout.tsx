import { PRODUCT_NAME, type MeResponse } from '@notamotors/shared';
import type { ReactNode } from 'react';
import { useLogout } from '../auth/use-logout';

function AccessBanner({ access }: { access: MeResponse['access'] }) {
  if (access.status === 'trial') {
    const days = access.trialDaysLeft;
    return (
      <p className="banner" role="status">
        Teste grátis: {days} {days === 1 ? 'dia restante' : 'dias restantes'}
      </p>
    );
  }
  if (access.status === 'manual') {
    return (
      <p className="banner" role="status">
        Acesso liberado (loja piloto)
      </p>
    );
  }
  return null;
}

export function AppLayout({ me, children }: { me: MeResponse; children: ReactNode }) {
  const logout = useLogout();
  return (
    <div className="app">
      <header className="app-header">
        <div>
          <span className="brand">{PRODUCT_NAME}</span>
          <span className="store-name">{me.store.name}</span>
        </div>
        <div className="app-header-actions">
          <span className="user-name">{me.user.name}</span>
          <button
            type="button"
            className="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Sair
          </button>
        </div>
      </header>
      <AccessBanner access={me.access} />
      <main className="app-main">{children}</main>
    </div>
  );
}
