import { zodResolver } from '@hookform/resolvers/zod';
import {
  formatCnpj,
  formatCpf,
  partyInputSchema,
  TAX_REGIME_LABELS,
  UFS,
  type MeResponse,
  type PartyInput,
  type PartyResponse,
} from '@notamotors/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import type { z } from 'zod';
import { api, ApiError } from '../../api/client';
import { AppLayout } from '../../components/app-layout';
import { CheckboxField } from '../../components/checkbox-field';
import { Field } from '../../components/field';
import { applyServerErrors } from '../../components/form-errors';
import { SelectField } from '../../components/select-field';

type FormValues = z.input<typeof partyInputSchema>;

const EMPTY: FormValues = {
  kind: 'person',
  document: '',
  name: '',
  tradeName: '',
  isMei: false,
  companyTaxRegime: '',
  stateRegistration: '',
  email: '',
  phone: '',
  postalCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  cityIbgeCode: '',
  uf: '',
  notes: '',
};

function toForm(p: PartyResponse): FormValues {
  const blank = (v: string | null) => v ?? '';
  return {
    kind: p.kind,
    document: p.document
      ? p.kind === 'person'
        ? formatCpf(p.document)
        : formatCnpj(p.document)
      : '',
    name: p.name,
    tradeName: blank(p.tradeName),
    isMei: p.isMei,
    companyTaxRegime: p.companyTaxRegime ?? '',
    stateRegistration: blank(p.stateRegistration),
    email: blank(p.email),
    phone: blank(p.phone),
    postalCode: blank(p.postalCode),
    street: blank(p.street),
    number: blank(p.number),
    complement: blank(p.complement),
    district: blank(p.district),
    city: blank(p.city),
    cityIbgeCode: blank(p.cityIbgeCode),
    uf: p.uf ?? '',
    notes: blank(p.notes),
  };
}

export function PartyFormPage({ me }: { me: MeResponse }) {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const existing = useQuery({
    queryKey: ['parties', id],
    queryFn: () => api<PartyResponse>(`/parties/${id}`),
    enabled: !isNew,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, PartyInput>({
    resolver: zodResolver(partyInputSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (existing.data) reset(toForm(existing.data));
  }, [existing.data, reset]);

  const kind = useWatch({ control, name: 'kind' });
  const isMei = useWatch({ control, name: 'isMei' });
  const isCompany = kind === 'company';

  const onSubmit = handleSubmit(async (input) => {
    try {
      const saved = await api<PartyResponse>(isNew ? '/parties' : `/parties/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: input,
      });
      queryClient.setQueryData(['parties', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['parties'] });
      await navigate('/app/pessoas');
    } catch (error) {
      applyServerErrors(error, setError, { 409: 'document' });
    }
  });

  if (!isNew && existing.error instanceof ApiError && existing.error.status === 404) {
    return (
      <AppLayout me={me}>
        <h1>Pessoa não encontrada</h1>
        <Link to="/app/pessoas">Voltar para a lista</Link>
      </AppLayout>
    );
  }

  return (
    <AppLayout me={me}>
      <p className="breadcrumb">
        <Link to="/app/pessoas">Pessoas</Link>
      </p>
      <h1>{isNew ? 'Nova pessoa' : 'Editar pessoa'}</h1>
      {!isNew && existing.isPending ? <p role="status">Carregando…</p> : null}

      <form className="card form-wide" onSubmit={onSubmit} noValidate>
        <fieldset disabled={isSubmitting || (!isNew && existing.isPending)}>
          <div className="field">
            <span className="field-label" id="kind-label">
              Tipo
            </span>
            <div className="radio-group" role="radiogroup" aria-labelledby="kind-label">
              <label>
                <input type="radio" value="person" {...register('kind')} /> Pessoa física (CPF)
              </label>
              <label>
                <input type="radio" value="company" {...register('kind')} /> Pessoa jurídica (CNPJ)
              </label>
            </div>
          </div>

          <div className="grid-2">
            <Field
              label={isCompany ? 'Razão social' : 'Nome completo'}
              registration={register('name')}
              error={errors.name}
            />
            <Field
              label={isCompany ? 'CNPJ' : 'CPF'}
              hint="Pode deixar em branco agora; a compra e a venda vão pedir"
              autoCapitalize="characters"
              registration={register('document')}
              error={errors.document}
            />
          </div>

          {isCompany ? (
            <div className="grid-2">
              <Field
                label="Nome fantasia"
                registration={register('tradeName')}
                error={errors.tradeName}
              />
              <Field
                label="Inscrição estadual"
                autoCapitalize="characters"
                registration={register('stateRegistration')}
                error={errors.stateRegistration}
              />
              <CheckboxField
                label="É MEI"
                hint="(microempreendedor individual)"
                registration={register('isMei')}
              />
              {!isMei ? (
                <SelectField
                  label="Regime tributário"
                  placeholder="Não sei / não informado"
                  options={(['simples', 'regular'] as const).map((r) => ({
                    value: r,
                    label: TAX_REGIME_LABELS[r],
                  }))}
                  registration={register('companyTaxRegime')}
                  error={errors.companyTaxRegime}
                />
              ) : null}
            </div>
          ) : null}

          <h2>Contato</h2>
          <div className="grid-2">
            <Field
              label="E-mail"
              type="email"
              registration={register('email')}
              error={errors.email}
            />
            <Field
              label="Telefone"
              type="tel"
              registration={register('phone')}
              error={errors.phone}
            />
          </div>

          <h2>Endereço</h2>
          <div className="grid-3">
            <Field
              label="CEP"
              inputMode="numeric"
              registration={register('postalCode')}
              error={errors.postalCode}
            />
            <Field label="Logradouro" registration={register('street')} error={errors.street} />
            <Field label="Número" registration={register('number')} error={errors.number} />
            <Field
              label="Complemento"
              registration={register('complement')}
              error={errors.complement}
            />
            <Field label="Bairro" registration={register('district')} error={errors.district} />
            <Field label="Cidade" registration={register('city')} error={errors.city} />
            <SelectField
              label="Estado (UF)"
              placeholder="Escolha"
              options={UFS.map((uf) => ({ value: uf, label: uf }))}
              registration={register('uf')}
              error={errors.uf}
            />
            <Field
              label="Código IBGE do município"
              inputMode="numeric"
              hint="7 números; a nota fiscal vai exigir"
              registration={register('cityIbgeCode')}
              error={errors.cityIbgeCode}
            />
          </div>

          <div className="field">
            <label htmlFor="party-notes">Observações</label>
            <textarea id="party-notes" rows={3} {...register('notes')} />
          </div>

          {errors.root ? (
            <p className="form-error" role="alert">
              {errors.root.message}
            </p>
          ) : null}
          <div className="form-actions">
            <Link className="button" to="/app/pessoas">
              Cancelar
            </Link>
            <button type="submit" className="button primary inline">
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </fieldset>
      </form>
    </AppLayout>
  );
}
