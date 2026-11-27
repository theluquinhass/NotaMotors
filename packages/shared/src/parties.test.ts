import { describe, expect, it } from 'vitest';
import { partyInputSchema } from './parties.js';

describe('partyInputSchema', () => {
  it('normalizes a person: CPF digits, empty optional fields become null', () => {
    const p = partyInputSchema.parse({
      kind: 'person',
      document: '529.982.247-25',
      name: '  José Teste ',
      email: '',
      phone: ' ',
      postalCode: '01310-100',
      uf: 'SP',
    });
    expect(p).toMatchObject({
      kind: 'person',
      document: '52998224725',
      name: 'José Teste',
      email: null,
      phone: null,
      postalCode: '01310100',
      uf: 'SP',
      isMei: false,
      companyTaxRegime: null,
    });
  });

  it('accepts a quick registration with only kind and name', () => {
    const p = partyInputSchema.parse({ kind: 'person', name: 'Cliente do balcão' });
    expect(p.document).toBeNull();
  });

  it('validates the document according to the kind', () => {
    const cpfAsCompany = partyInputSchema.safeParse({
      kind: 'company',
      document: '529.982.247-25',
      name: 'X',
    });
    expect(cpfAsCompany.error?.issues[0]?.message).toBe('CNPJ inválido');

    const badCpf = partyInputSchema.safeParse({
      kind: 'person',
      document: '52998224724',
      name: 'X',
    });
    expect(badCpf.error?.issues[0]?.message).toBe('CPF inválido');
  });

  it('clears company-only fields for a person and regime for a MEI', () => {
    const person = partyInputSchema.parse({
      kind: 'person',
      name: 'X',
      tradeName: 'Fantasia',
      isMei: true,
      companyTaxRegime: 'regular',
    });
    expect(person).toMatchObject({ tradeName: null, isMei: false, companyTaxRegime: null });

    const mei = partyInputSchema.parse({
      kind: 'company',
      document: '12.ABC.345/01DE-35',
      name: 'MEI Teste',
      isMei: true,
      companyTaxRegime: 'simples',
    });
    expect(mei).toMatchObject({ document: '12ABC34501DE35', isMei: true, companyTaxRegime: null });
  });

  it('rejects malformed CEP and e-mail with Portuguese messages', () => {
    const r = partyInputSchema.safeParse({
      kind: 'person',
      name: 'X',
      postalCode: '123',
      email: 'nao-e-email',
    });
    const messages = r.error?.issues.map((i) => i.message);
    expect(messages).toContain('CEP deve ter 8 números');
    expect(messages).toContain('E-mail inválido');
  });
});
