import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from '../access/access.guard.js';
import { AccessService } from '../access/access.service.js';
import { AuthController } from './auth.controller.js';
import { LoginService } from './login.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { SignupService } from './signup.service.js';

@Module({
  controllers: [AuthController],
  providers: [
    SignupService,
    LoginService,
    SessionService,
    AccessService,
    // Guards globais, nesta ordem (o Nest executa na ordem de registro):
    // 1. toda rota exige sessão, exceto @Public();
    // 2. rota do dashboard exige acesso liberado, exceto @AllowBlocked().
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [SessionService, AccessService],
})
export class AuthModule {}
