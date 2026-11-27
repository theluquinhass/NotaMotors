import { Body, Controller, Get, Inject, NotFoundException, Put } from '@nestjs/common';
import {
  storeFiscalInputSchema,
  type CurrentStoreResponse,
  type StoreFiscalInput,
  type StoreFiscalResponse,
} from '@notamotors/shared';
import { eq } from 'drizzle-orm';
import type { AuthContext } from '../auth/auth-context.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { requireOwner } from '../auth/require-owner.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { stores } from '../db/schema/index.js';
import { withTenant } from '../db/tenant.js';
import { StoreFiscalService } from './store-fiscal.service.js';

@Controller('stores')
export class StoresController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly fiscal: StoreFiscalService,
  ) {}

  @Get('current/fiscal')
  getFiscal(@CurrentAuth() auth: AuthContext): Promise<StoreFiscalResponse> {
    return this.fiscal.get(auth);
  }

  /** CNPJ, inscrição estadual, UF e regime. Só o dono da loja altera. */
  @Put('current/fiscal')
  updateFiscal(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(storeFiscalInputSchema)) body: StoreFiscalInput,
  ): Promise<StoreFiscalResponse> {
    requireOwner(auth, 'alterar os dados fiscais');
    return this.fiscal.update(auth, body);
  }

  /** Dados da loja logada. Rota do dashboard: exige sessão e acesso liberado. */
  @Get('current')
  async current(@CurrentAuth() auth: AuthContext): Promise<CurrentStoreResponse> {
    const [store] = await withTenant(this.db, auth, (tx) =>
      tx
        .select({
          id: stores.id,
          name: stores.name,
          fiscalStatus: stores.fiscalStatus,
          cnpj: stores.cnpj,
          uf: stores.uf,
        })
        .from(stores)
        .where(eq(stores.id, auth.storeId))
        .limit(1),
    );
    if (!store) throw new NotFoundException('Loja não encontrada');
    return store;
  }
}
