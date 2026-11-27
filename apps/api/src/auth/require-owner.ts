import { ForbiddenException } from '@nestjs/common';
import type { AuthContext } from './auth-context.js';

/** Barra quem não é dono da loja (ex.: vendedor alterando dados fiscais). */
export function requireOwner(auth: AuthContext, action: string): void {
  if (auth.role !== 'owner') {
    throw new ForbiddenException(`Só o dono da loja pode ${action}`);
  }
}
