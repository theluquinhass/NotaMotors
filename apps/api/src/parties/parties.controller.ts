import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  partyInputSchema,
  type PartyInput,
  type PartyListResponse,
  type PartyResponse,
} from '@notamotors/shared';
import type { AuthContext } from '../auth/auth-context.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PartiesService } from './parties.service.js';

/** Clientes e fornecedores. Dono e vendedor podem cadastrar e editar. */
@Controller('parties')
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query('q') q?: string,
    @Query('page') page?: string,
  ): Promise<PartyListResponse> {
    const n = Number.parseInt(page ?? '1', 10);
    return this.parties.list(auth, (q ?? '').slice(0, 100), Number.isFinite(n) && n > 0 ? n : 1);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id') id: string): Promise<PartyResponse> {
    return this.parties.get(auth, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(partyInputSchema)) body: PartyInput,
  ): Promise<PartyResponse> {
    return this.parties.create(auth, body);
  }

  @Put(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(partyInputSchema)) body: PartyInput,
  ): Promise<PartyResponse> {
    return this.parties.update(auth, id, body);
  }
}
