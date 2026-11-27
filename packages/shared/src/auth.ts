import { z } from 'zod';

const emailField = z
  .string({ error: 'Informe seu e-mail' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'E-mail inválido' }).max(254, { error: 'E-mail muito longo' }));

export const signupInputSchema = z.object({
  name: z
    .string({ error: 'Informe seu nome' })
    .trim()
    .min(2, { error: 'Nome muito curto' })
    .max(120, { error: 'Nome muito longo' }),
  email: emailField,
  password: z
    .string({ error: 'Informe uma senha' })
    .min(8, { error: 'A senha precisa ter pelo menos 8 caracteres' })
    .max(128, { error: 'A senha pode ter no máximo 128 caracteres' }),
  storeName: z
    .string({ error: 'Informe o nome da loja' })
    .trim()
    .min(2, { error: 'Nome da loja muito curto' })
    .max(120, { error: 'Nome da loja muito longo' }),
});

export type SignupInput = z.infer<typeof signupInputSchema>;

export interface SignupResponse {
  userId: string;
  storeId: string;
  /** ISO 8601 em UTC, calculado pelo servidor. */
  trialEndsAt: string;
}

export const loginInputSchema = z.object({
  email: emailField,
  // No login não se aplicam as regras de tamanho: a senha só é conferida.
  password: z
    .string({ error: 'Informe sua senha' })
    .min(1, { error: 'Informe sua senha' })
    .max(128),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export type MembershipRole = 'owner' | 'seller';

/** Quem está logado e em qual loja. Resposta de /auth/me e /auth/login. */
export interface MeResponse {
  user: { id: string; name: string; email: string };
  store: { id: string; name: string };
  role: MembershipRole;
}
