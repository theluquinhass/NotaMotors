import { z } from 'zod';
import { isValidCnpj, normalizeCnpj } from './cnpj.js';
import { isValidCpf, normalizeCpf } from './cpf.js';
import { UFS, type TaxRegime, type Uf } from './store-fiscal.js';

export type PartyKind = 'person' | 'company';

/** Campo de texto opcional: espaços viram nada, vazio vira null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo de ${max} caracteres` })
    .transform((v) => (v === '' ? null : v))
    .nullish()
    .transform((v) => v ?? null);

const optionalDigits = (length: number, message: string) =>
  z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().regex(new RegExp(`^(\\d{${length}})?$`), { error: message }))
    .transform((v) => (v === '' ? null : v))
    .nullish()
    .transform((v) => v ?? null);

export const partyInputSchema = z
  .object({
    kind: z.enum(['person', 'company'], { error: 'Escolha pessoa física ou jurídica' }),
    document: z
      .string()
      .trim()
      .nullish()
      .transform((v) => (v ? v : null)),
    name: z
      .string({ error: 'Informe o nome' })
      .trim()
      .min(1, { error: 'Informe o nome' })
      .max(160, { error: 'Nome muito longo' }),
    tradeName: optionalText(160),
    isMei: z.boolean().default(false),
    companyTaxRegime: z
      .union([z.literal(''), z.enum(['simples', 'regular'], { error: 'Regime inválido' })])
      .nullish()
      .transform((v) => (v ? v : null)),
    stateRegistration: z
      .string()
      .transform((v) => v.replace(/[.\-/\s]/g, '').toUpperCase())
      .pipe(z.string().regex(/^([0-9A-Z]{2,14})?$/, { error: 'Inscrição estadual inválida' }))
      .transform((v) => (v === '' ? null : v))
      .nullish()
      .transform((v) => v ?? null),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.union([z.literal(''), z.email({ error: 'E-mail inválido' })]))
      .transform((v) => (v === '' ? null : v))
      .nullish()
      .transform((v) => v ?? null),
    phone: optionalText(30),
    postalCode: optionalDigits(8, 'CEP deve ter 8 números'),
    street: optionalText(160),
    number: optionalText(20),
    complement: optionalText(80),
    district: optionalText(80),
    city: optionalText(80),
    cityIbgeCode: optionalDigits(7, 'Código IBGE deve ter 7 números'),
    uf: z
      .union([z.literal(''), z.enum(UFS, { error: 'Estado inválido' })])
      .nullish()
      .transform((v) => (v ? v : null)),
    notes: optionalText(2000),
  })
  .transform((p, ctx) => {
    let document = p.document;
    if (document) {
      if (p.kind === 'person') {
        document = normalizeCpf(document);
        if (!isValidCpf(document)) {
          ctx.addIssue({ code: 'custom', path: ['document'], message: 'CPF inválido' });
        }
      } else {
        document = normalizeCnpj(document);
        if (!isValidCnpj(document)) {
          ctx.addIssue({ code: 'custom', path: ['document'], message: 'CNPJ inválido' });
        }
      }
    }
    const isCompany = p.kind === 'company';
    return {
      ...p,
      document,
      // Campos que só fazem sentido para PJ são limpos em PF.
      tradeName: isCompany ? p.tradeName : null,
      isMei: isCompany ? p.isMei : false,
      companyTaxRegime: isCompany && !p.isMei ? p.companyTaxRegime : null,
    };
  });

export type PartyInput = z.infer<typeof partyInputSchema>;

export interface PartyResponse {
  id: string;
  kind: PartyKind;
  document: string | null;
  name: string;
  tradeName: string | null;
  isMei: boolean;
  companyTaxRegime: TaxRegime | null;
  stateRegistration: string | null;
  email: string | null;
  phone: string | null;
  postalCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  cityIbgeCode: string | null;
  uf: Uf | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartyListResponse {
  items: PartyResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export const PARTIES_PAGE_SIZE = 20;
