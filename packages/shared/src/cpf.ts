/** CPF: 9 dígitos + 2 verificadores (módulo 11, pesos 10..2 e 11..2). */

export function normalizeCpf(value: string): string {
  return value.replace(/[.\-\s]/g, '');
}

function checkDigit(digits: string, firstWeight: number): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += Number(digits[i]) * (firstWeight - i);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(cpf: string): boolean {
  if (!/^[0-9]{11}$/.test(cpf)) return false;
  if (/^(.)\1{10}$/.test(cpf)) return false;
  const d1 = checkDigit(cpf.slice(0, 9), 10);
  const d2 = checkDigit(cpf.slice(0, 10), 11);
  return cpf.slice(9) === `${d1}${d2}`;
}

/** Calcula os 2 dígitos verificadores para 9 dígitos (útil para dados fictícios de teste). */
export function cpfCheckDigits(base9: string): string {
  const d1 = checkDigit(base9, 10);
  const d2 = checkDigit(base9 + d1, 11);
  return `${d1}${d2}`;
}

/** "52998224725" → "529.982.247-25" */
export function formatCpf(cpf: string): string {
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}
