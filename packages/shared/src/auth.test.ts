import { describe, expect, it } from 'vitest';
import { signupInputSchema } from './auth.js';

const valid = {
  name: '  Maria Teste ',
  email: ' Maria@Exemplo.TEST ',
  password: 'senha-forte-123',
  storeName: ' Auto Teste ',
};

describe('signupInputSchema', () => {
  it('normalizes name, e-mail and store name', () => {
    expect(signupInputSchema.parse(valid)).toEqual({
      name: 'Maria Teste',
      email: 'maria@exemplo.test',
      password: 'senha-forte-123',
      storeName: 'Auto Teste',
    });
  });

  it('keeps the password exactly as typed', () => {
    const parsed = signupInputSchema.parse({ ...valid, password: '  com espaço  ' });
    expect(parsed.password).toBe('  com espaço  ');
  });

  it('rejects invalid e-mail and short password with Portuguese messages', () => {
    const result = signupInputSchema.safeParse({ ...valid, email: 'nao-e-email', password: '123' });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((i) => i.message);
    expect(messages).toContain('E-mail inválido');
    expect(messages).toContain('A senha precisa ter pelo menos 8 caracteres');
  });

  it('requires all fields', () => {
    const result = signupInputSchema.safeParse({});
    expect(result.error?.issues.map((i) => i.path[0])).toEqual([
      'name',
      'email',
      'password',
      'storeName',
    ]);
  });
});
