import { ACCESS_BLOCK_MESSAGES, PRODUCT_NAME, type MeResponse } from '@notamotors/shared';
import { Link } from 'react-router';
import { useLogout } from '../auth/use-logout';
import { AuthLayout } from '../components/auth-layout';

export function CheckoutPage({ me }: { me: MeResponse }) {
  const logout = useLogout();

  if (me.access.allowed) {
    return (
      <AuthLayout title="Sua conta está ativa">
        <p className="lead">Você já pode usar o {PRODUCT_NAME}.</p>
        <Link className="button primary" to="/app">
          Ir para o painel
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Assinatura">
      <p className="lead">{me.access.reason ? ACCESS_BLOCK_MESSAGES[me.access.reason] : null}</p>
      <p>
        Seus dados da loja <strong>{me.store.name}</strong> continuam guardados.
      </p>
      <p className="notice">A assinatura online estará disponível em breve.</p>
      <button type="button" className="button" onClick={() => logout.mutate()}>
        Sair
      </button>
    </AuthLayout>
  );
}
