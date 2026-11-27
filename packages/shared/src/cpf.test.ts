import { describe, expect, it } from 'vitest';
import { cpfCheckDigits, formatCpf, isValidCpf, normalizeCpf } from './cpf.js';

describe('CPF', () => {
  it('validates check digits', () => {
    // CPF de exemplo amplamente usado em documentação (fictício).
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('52998224724')).toBe(false);
    expect(cpfCheckDigits('529982247')).toBe('25');
  });

  it('rejects repeated digits and wrong length', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('5299822472A')).toBe(false);
  });

  it('normalizes and formats', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });
});
