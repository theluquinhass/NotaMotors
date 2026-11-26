import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { signupInputSchema, type SignupInput, type SignupResponse } from '@notamotors/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SignupService } from './signup.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly signupService: SignupService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(
    @Body(new ZodValidationPipe(signupInputSchema)) body: SignupInput,
  ): Promise<SignupResponse> {
    return this.signupService.signup(body);
  }
}
