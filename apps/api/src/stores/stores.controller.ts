import { Controller, Get, Inject, NotFoundException } from '@nestjs/common';
import type { CurrentStoreResponse } from '@notamotors/shared';
import { eq } from 'drizzle-orm';
import type { AuthContext } from '../auth/auth-context.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { stores } from '../db/schema/index.js';
import { withTenant } from '../db/tenant.js';

@Controller('stores')
export class StoresController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

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
