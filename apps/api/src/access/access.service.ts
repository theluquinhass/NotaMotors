import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AccessInfo } from '@notamotors/shared';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { subscriptions } from '../db/schema/index.js';
import { withTenant } from '../db/tenant.js';
import { computeAccess } from './compute-access.js';

@Injectable()
export class AccessService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Situação de acesso da loja agora, pelo relógio do banco. */
  async forStore(storeId: string): Promise<AccessInfo> {
    const [row] = await withTenant(this.db, { storeId }, (tx) =>
      tx
        .select({
          status: subscriptions.status,
          trialEndsAt: subscriptions.trialEndsAt,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          manualGrant: subscriptions.manualGrant,
          dbNow: sql<Date>`now()`.mapWith((v: string | Date) => new Date(v)),
        })
        .from(subscriptions)
        .where(eq(subscriptions.storeId, storeId))
        .limit(1),
    );

    // Toda loja nasce com assinatura no cadastro; sem ela, bloqueia.
    if (!row) throw new ForbiddenException('Loja sem assinatura');

    const { dbNow, ...snapshot } = row;
    return computeAccess(snapshot, dbNow);
  }
}
