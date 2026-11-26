import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { SignupService } from './signup.service.js';

@Module({
  controllers: [AuthController],
  providers: [SignupService],
})
export class AuthModule {}
