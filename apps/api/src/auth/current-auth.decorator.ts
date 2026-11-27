import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthContext, AuthenticatedRequest } from './auth-context.js';

/** Contexto de quem está logado. Só use em rotas protegidas pelo SessionGuard. */
export const CurrentAuth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthContext => {
    const auth = ctx.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!auth) throw new Error('CurrentAuth usado em rota sem SessionGuard');
    return auth;
  },
);
