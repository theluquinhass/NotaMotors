import { Link } from 'react-router';
import { AuthLayout } from '../components/auth-layout';

export function NotFoundPage() {
  return (
    <AuthLayout title="Página não encontrada">
      <Link className="button" to="/app">
        Voltar ao início
      </Link>
    </AuthLayout>
  );
}
