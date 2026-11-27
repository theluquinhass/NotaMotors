import { describe, expect, it } from 'vitest';
import { cnpjCheckDigits, formatCnpj, isValidCnpj, normalizeCnpj } from './cnpj.js';

describe('CNPJ', () => {
  it('validates a classic numeric CNPJ', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('11222333000182')).toBe(false);
  });

  it('validates the alphanumeric example published by Receita Federal', () => {
    expect(cnpjCheckDigits('12ABC34501DE')).toBe('35');
    expect(isValidCnpj('12ABC34501DE35')).toBe(true);
    expect(isValidCnpj('12ABC34501DE36')).toBe(false);
  });

  it('rejects repeated sequences, wrong length and letters in the check digits', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
    expect(isValidCnpj('1122233300018')).toBe(false);
    expect(isValidCnpj('12ABC34501DE3A')).toBe(false);
  });

  it('normalizes punctuation and case', () => {
    expect(normalizeCnpj(' 12.abc.345/01de-35 ')).toBe('12ABC34501DE35');
    expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('formats for display', () => {
    expect(formatCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });
});
