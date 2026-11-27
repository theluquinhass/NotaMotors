import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
    // Toda rota da API exige sessão, exceto as marcadas com @Public().
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [SessionService],
})
export class AuthModule {}
