import type { MeResponse, PartyListResponse } from '@notamotors/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import { AppLayout } from '../../components/app-layout';
import { formatDocument, partyTypeLabel } from './party-labels';

export function PartiesListPage({ me }: { me: MeResponse }) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const [term, setTerm] = useState(q);

  const list = useQuery({
    queryKey: ['parties', { q, page }],
    queryFn: () =>
      api<PartyListResponse>(`/parties?${new URLSearchParams({ q, page: String(page) })}`),
    placeholderData: keepPreviousData,
  });

  const search = (e: FormEvent) => {
    e.preventDefault();
    setParams(term.trim() ? { q: term.trim() } : {});
  };
  const goTo = (p: number) => setParams({ ...(q ? { q } : {}), page: String(p) });
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <AppLayout me={me}>
      <div className="page-title">
        <h1>Pessoas</h1>
        <Link className="button primary inline" to="/app/pessoas/nova">
          Nova pessoa
        </Link>
      </div>
      <p className="lead">Clientes e fornecedores da loja, numa lista só.</p>

      <form className="search" role="search" onSubmit={search}>
        <label htmlFor="parties-search" className="sr-only">
          Buscar por nome ou CPF/CNPJ
        </label>
        <input
          id="parties-search"
          type="search"
          placeholder="Buscar por nome ou CPF/CNPJ"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button type="submit" className="button">
          Buscar
        </button>
      </form>

      {list.isPending ? <p role="status">Carregando…</p> : null}
      {list.isError ? <p className="form-error">Não foi possível carregar a lista.</p> : null}
      {list.data && list.data.items.length === 0 ? (
        <p className="empty">
          {q ? `Ninguém encontrado para “${q}”.` : 'Nenhuma pessoa cadastrada ainda.'}
        </p>
      ) : null}

      {list.data && list.data.items.length > 0 ? (
        <>
          <ul className="list" aria-label="Pessoas">
            {list.data.items.map((p) => (
              <li key={p.id}>
                <Link to={`/app/pessoas/${p.id}`}>
                  <span className="list-title">{p.tradeName ?? p.name}</span>
                  <span className="list-meta">
                    {partyTypeLabel(p)} · {formatDocument(p)}
                    {p.city ? ` · ${p.city}/${p.uf ?? ''}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 ? (
            <nav className="pagination" aria-label="Páginas">
              <button
                type="button"
                className="button"
                disabled={page <= 1}
                onClick={() => goTo(page - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page} de {pages}
              </span>
              <button
                type="button"
                className="button"
                disabled={page >= pages}
                onClick={() => goTo(page + 1)}
              >
                Próxima
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </AppLayout>
  );
}
