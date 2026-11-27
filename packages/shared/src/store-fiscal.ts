import { z } from 'zod';
import { isValidCnpj, normalizeCnpj } from './cnpj.js';

export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

export type Uf = (typeof UFS)[number];

export type TaxRegime = 'simples' | 'regular';

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  simples: 'Simples Nacional',
  regular: 'Regime regular (Lucro Presumido ou Real)',
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Dados fiscais da loja. O CNPJ é validado pelo dígito verificador.
 * A inscrição estadual só tem o formato conferido: o dígito verificador muda por estado
 * e ainda não foi implementado (ver docs/pendencias-contador.md).
 */
export const storeFiscalInputSchema = z.object({
  cnpj: z
    .string({ error: 'Informe o CNPJ' })
    .transform(normalizeCnpj)
    .pipe(
      z
        .string()
        .min(1, { error: 'Informe o CNPJ' })
        .refine(isValidCnpj, { error: 'CNPJ inválido: confira os números e letras' }),
    ),
  stateRegistration: z
    .string({ error: 'Informe a inscrição estadual' })
    .transform((v) => v.replace(/[.\-/\s]/g, '').toUpperCase())
    .pipe(
      z
        .string()
        .min(1, { error: 'Informe a inscrição estadual' })
        .regex(/^[0-9A-Z]{2,14}$/, { error: 'Inscrição estadual inválida' }),
    ),
  uf: z.enum(UFS, { error: 'Escolha o estado' }),
  regime: z.enum(['simples', 'regular'], { error: 'Escolha o regime tributário' }),
  regimeValidFrom: z
    .string({ error: 'Informe desde quando a loja está neste regime' })
    .regex(isoDate, { error: 'Data inválida' })
    .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), { error: 'Data inválida' }),
});

export type StoreFiscalInput = z.infer<typeof storeFiscalInputSchema>;

/** O que falta para a loja poder emitir nota (o certificado digital chega no marco 2). */
export interface FiscalChecklist {
  cnpj: boolean;
  stateRegistration: boolean;
  regime: boolean;
  certificate: boolean;
}

export interface StoreFiscalResponse {
  id: string;
  name: string;
  cnpj: string | null;
  stateRegistration: string | null;
  uf: Uf | null;
  fiscalStatus: 'incomplete' | 'complete';
  regime: { regime: TaxRegime; validFrom: string } | null;
  checklist: FiscalChecklist;
}
