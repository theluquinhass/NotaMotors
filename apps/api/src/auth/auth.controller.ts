import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import {
  loginInputSchema,
  signupInputSchema,
  type LoginInput,
  type MeResponse,
  type SignupInput,
  type SignupResponse,
} from '@notamotors/shared';
import type { Response } from 'express';
import { AccessService } from '../access/access.service.js';
import { AllowBlocked } from '../access/allow-blocked.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { AuthContext } from './auth-context.js';
import { clearSessionCookie, setSessionCookie } from './cookies.js';
import { CurrentAuth } from './current-auth.decorator.js';
import { LoginService } from './login.service.js';
import { Public } from './public.decorator.js';
import { SessionService } from './session.service.js';
import { SignupService } from './signup.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupService: SignupService,
    private readonly loginService: LoginService,
    private readonly sessionService: SessionService,
    private readonly accessService: AccessService,
  ) {}

  private async meWithAccess(userId: string, storeId: string): Promise<MeResponse> {
    const [me, access] = await Promise.all([
      this.loginService.me(userId, storeId),
      this.accessService.forStore(storeId),
    ]);
    return { ...me, access };
  }

  /** Cadastro já entra logado: /cadastro → /app. */
  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body(new ZodValidationPipe(signupInputSchema)) body: SignupInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignupResponse> {
    const result = await this.signupService.signup(body);
    const session = await this.sessionService.create(result.userId, result.storeId);
    setSessionCookie(res, session.token, session.expiresAt);
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const { userId, storeId } = await this.loginService.verifyCredentials(body);
    const session = await this.sessionService.create(userId, storeId);
    setSessionCookie(res, session.token, session.expiresAt);
    return this.meWithAccess(userId, storeId);
  }

  @AllowBlocked()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentAuth() auth: AuthContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.sessionService.revoke(auth.sessionId);
    clearSessionCookie(res);
  }

  /** Funciona com a loja bloqueada: o front usa `access` para levar a /checkout. */
  @AllowBlocked()
  @Get('me')
  me(@CurrentAuth() auth: AuthContext): Promise<MeResponse> {
    return this.meWithAccess(auth.userId, auth.storeId);
  }
}
