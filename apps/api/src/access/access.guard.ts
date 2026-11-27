import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_BLOCK_MESSAGES, ACCESS_BLOCKED, type AccessBlockedError } from '@notamotors/shared';
import type { AuthenticatedRequest } from '../auth/auth-context.js';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import { AccessService } from './access.service.js';
import { ALLOW_BLOCKED } from './allow-blocked.decorator.js';

/**
 * Guard global, roda depois do SessionGuard: bloqueia o dashboard quando o teste
 * venceu ou a assinatura não está ativa. A situação é recalculada a cada requisição.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_BLOCKED, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // O SessionGuard roda antes e já barrou quem não tem sessão.
    if (!req.auth) throw new Error('AccessGuard rodou antes do SessionGuard');

    const access = await this.access.forStore(req.auth.storeId);
    if (access.allowed) return true;

    const body: AccessBlockedError = {
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      code: ACCESS_BLOCKED,
      reason: access.reason!,
      message: ACCESS_BLOCK_MESSAGES[access.reason!],
    };
    throw new HttpException(body, HttpStatus.PAYMENT_REQUIRED);
  }
}
