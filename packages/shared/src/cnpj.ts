/**
 * CNPJ alfanumérico (IN RFB 2.229/2024): 12 caracteres [0-9A-Z] + 2 dígitos verificadores.
 * Cada caractere vale (código ASCII − 48): '0'..'9' = 0..9, 'A' = 17 ... 'Z' = 42.
 * Pesos de 2 a 9 da direita para a esquerda, módulo 11. Também vale para CNPJ só numérico.
 */

const BASE = /^[0-9A-Z]{12}$/;
const FULL = /^[0-9A-Z]{12}[0-9]{2}$/;

/** Tira pontuação e espaços e passa para maiúsculas: "12.abc.345/01de-35" → "12ABC34501DE35". */
export function normalizeCnpj(value: string): string {
  return value.replace(/[.\-/\s]/g, '').toUpperCase();
}

function checkDigit(base: string): number {
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    const weight = ((base.length - 1 - i) % 8) + 2;
    sum += (base.charCodeAt(i) - 48) * weight;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** Calcula os 2 dígitos verificadores para uma base de 12 caracteres. */
export function cnpjCheckDigits(base12: string): string {
  if (!BASE.test(base12)) throw new Error('Base de CNPJ inválida');
  const d1 = checkDigit(base12);
  const d2 = checkDigit(base12 + d1);
  return `${d1}${d2}`;
}

/** Valida um CNPJ já normalizado (14 caracteres, sem pontuação). */
export function isValidCnpj(cnpj: string): boolean {
  if (!FULL.test(cnpj)) return false;
  // Sequências repetidas (00000000000000, 11111111111111…) passam no cálculo, mas não existem.
  if (/^(.)\1{13}$/.test(cnpj)) return false;
  return cnpj.slice(12) === cnpjCheckDigits(cnpj.slice(0, 12));
}

/** "12ABC34501DE35" → "12.ABC.345/01DE-35" */
export function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}
