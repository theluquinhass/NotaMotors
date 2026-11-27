import type { CurrentStoreResponse, MeResponse } from '@notamotors/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../api/client';
import { AppLayout } from '../components/app-layout';

export function DashboardPage({ me }: { me: MeResponse }) {
  const store = useQuery({
    queryKey: ['stores', 'current'],
    queryFn: () => api<CurrentStoreResponse>('/stores/current'),
  });

  return (
    <AppLayout me={me}>
      <h1>Olá, {me.user.name.split(' ')[0]}</h1>
      {store.data?.fiscalStatus === 'incomplete' ? (
        <p className="notice">
          Estoque e vendas já estão liberados. Para emitir nota fiscal, a loja vai precisar de CNPJ,
          inscrição estadual e certificado digital.{' '}
          <Link to="/app/empresa">Preencher os dados da empresa</Link>
        </p>
      ) : null}
      <div className="cards">
        <section className="card">
          <h2>Estoque</h2>
          <p>Entrada de veículos por compra ou troca, custos e situação. Em breve.</p>
        </section>
        <section className="card">
          <h2>Vendas</h2>
          <p>Venda com comprador, pagamento e veículo na troca. Em breve.</p>
        </section>
      </div>
    </AppLayout>
  );
}
