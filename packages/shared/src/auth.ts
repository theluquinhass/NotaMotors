import { z } from 'zod';

export const signupInputSchema = z.object({
  name: z
    .string({ error: 'Informe seu nome' })
    .trim()
    .min(2, { error: 'Nome muito curto' })
    .max(120, { error: 'Nome muito longo' }),
  email: z
    .string({ error: 'Informe seu e-mail' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'E-mail inválido' }).max(254, { error: 'E-mail muito longo' })),
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
