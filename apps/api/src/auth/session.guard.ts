import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth-context.js';
import { readCookie } from './cookies.js';
import { IS_PUBLIC } from './public.decorator.js';
import { SESSION_COOKIE } from './session.constants.js';
import { SessionService } from './session.service.js';

/** Guard global: fechado por padrão. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    const auth = token ? await this.sessions.resolve(token) : null;
    if (!auth) throw new UnauthorizedException('Faça login para continuar');

    req.auth = auth;
    return true;
  }
}
