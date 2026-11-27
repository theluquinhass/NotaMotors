import { zodResolver } from '@hookform/resolvers/zod';
import {
  formatCnpj,
  storeFiscalInputSchema,
  TAX_REGIME_LABELS,
  UFS,
  type FiscalChecklist,
  type MeResponse,
  type StoreFiscalInput,
  type StoreFiscalResponse,
} from '@notamotors/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { api } from '../api/client';
import { AppLayout } from '../components/app-layout';
import { Field } from '../components/field';
import { applyServerErrors } from '../components/form-errors';
import { SelectField } from '../components/select-field';

export const FISCAL_KEY = ['stores', 'current', 'fiscal'] as const;

const CHECKLIST_LABELS: Record<keyof FiscalChecklist, string> = {
  cnpj: 'CNPJ',
  stateRegistration: 'Inscrição estadual',
  regime: 'Regime tributário',
  certificate: 'Certificado digital (em breve)',
};

function Checklist({ checklist }: { checklist: FiscalChecklist }) {
  return (
    <section className="card">
      <h2>Para emitir nota fiscal</h2>
      <ul className="checklist">
        {(Object.keys(CHECKLIST_LABELS) as (keyof FiscalChecklist)[]).map((key) => (
          <li key={key} className={checklist[key] ? 'done' : undefined}>
            <span aria-hidden="true">{checklist[key] ? '✓' : '○'}</span> {CHECKLIST_LABELS[key]}
            <span className="sr-only">{checklist[key] ? ' (preenchido)' : ' (pendente)'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const today = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD no fuso local

function toForm(f: StoreFiscalResponse): z.input<typeof storeFiscalInputSchema> {
  return {
    cnpj: f.cnpj ? formatCnpj(f.cnpj) : '',
    stateRegistration: f.stateRegistration ?? '',
    uf: (f.uf ?? '') as StoreFiscalInput['uf'],
    regime: (f.regime?.regime ?? '') as StoreFiscalInput['regime'],
    regimeValidFrom: f.regime?.validFrom ?? today(),
  };
}

export function CompanyPage({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const isOwner = me.role === 'owner';
  const fiscal = useQuery({
    queryKey: FISCAL_KEY,
    queryFn: () => api<StoreFiscalResponse>('/stores/current/fiscal'),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.input<typeof storeFiscalInputSchema>, unknown, StoreFiscalInput>({
    resolver: zodResolver(storeFiscalInputSchema),
  });

  useEffect(() => {
    if (fiscal.data) reset(toForm(fiscal.data));
  }, [fiscal.data, reset]);

  const onSubmit = handleSubmit(async (input) => {
    setSaved(false);
    try {
      const updated = await api<StoreFiscalResponse>('/stores/current/fiscal', {
        method: 'PUT',
        body: input,
      });
      queryClient.setQueryData(FISCAL_KEY, updated);
      void queryClient.invalidateQueries({ queryKey: ['stores', 'current'], exact: true });
      setSaved(true);
    } catch (error) {
      applyServerErrors(error, setError, { 409: 'cnpj' });
    }
  });

  return (
    <AppLayout me={me}>
      <h1>Dados da empresa</h1>
      {fiscal.isPending ? <p role="status">Carregando…</p> : null}
      {fiscal.data ? (
        <div className="two-columns">
          <form className="card" onSubmit={onSubmit} noValidate>
            {!isOwner ? (
              <p className="notice">Só o dono da loja pode alterar estes dados.</p>
            ) : null}
            <fieldset disabled={!isOwner || isSubmitting}>
              <Field
                label="CNPJ"
                placeholder="00.000.000/0000-00"
                hint="Aceita o CNPJ novo, com letras"
                autoCapitalize="characters"
                registration={register('cnpj')}
                error={errors.cnpj}
              />
              <Field
                label="Inscrição estadual"
                autoCapitalize="characters"
                registration={register('stateRegistration')}
                error={errors.stateRegistration}
              />
              <SelectField
                label="Estado (UF)"
                placeholder="Escolha o estado"
                options={UFS.map((uf) => ({ value: uf, label: uf }))}
                registration={register('uf')}
                error={errors.uf}
              />
              <SelectField
                label="Regime tributário"
                placeholder="Escolha o regime"
                options={(['simples', 'regular'] as const).map((r) => ({
                  value: r,
                  label: TAX_REGIME_LABELS[r],
                }))}
                registration={register('regime')}
                error={errors.regime}
              />
              <Field
                label="Neste regime desde"
                type="date"
                hint="Na troca de regime, o anterior termina nesta data"
                registration={register('regimeValidFrom')}
                error={errors.regimeValidFrom}
              />
              {errors.root ? (
                <p className="form-error" role="alert">
                  {errors.root.message}
                </p>
              ) : null}
              {saved && !isDirty ? (
                <p className="form-success" role="status">
                  Dados salvos.
                </p>
              ) : null}
              {isOwner ? (
                <button type="submit" className="button primary">
                  {isSubmitting ? 'Salvando…' : 'Salvar'}
                </button>
              ) : null}
            </fieldset>
          </form>
          <Checklist checklist={fiscal.data.checklist} />
        </div>
      ) : null}
    </AppLayout>
  );
}
