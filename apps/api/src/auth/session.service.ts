import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { memberships, sessions } from '../db/schema/index.js';
import { setTenant, withTenant } from '../db/tenant.js';
import type { AuthContext } from './auth-context.js';
import { SESSION_TTL_DAYS } from './session.constants.js';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Cria a sessão e devolve o token (que só vai para o cookie, nunca para o banco). */
  async create(userId: string, storeId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const [row] = await this.db
      .insert(sessions)
      .values({
        userId,
        storeId,
        tokenHash: hashToken(token),
        // Validade pelo relógio do banco.
        expiresAt: sql`now() + make_interval(days => ${SESSION_TTL_DAYS})`,
      })
      .returning({ expiresAt: sessions.expiresAt });
    return { token, expiresAt: row!.expiresAt };
  }

  /**
   * Sessão válida = não revogada, não vencida e o usuário ainda tem vínculo com a loja.
   * Retorna null em qualquer outro caso.
   */
  async resolve(token: string): Promise<AuthContext | null> {
    return withTenant(this.db, {}, async (tx) => {
      const [session] = await tx
        .select({ id: sessions.id, userId: sessions.userId, storeId: sessions.storeId })
        .from(sessions)
        .where(
          and(
            eq(sessions.tokenHash, hashToken(token)),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, sql`now()`),
          ),
        )
        .limit(1);
      if (!session) return null;

      // Com a sessão encontrada, o vínculo é conferido já sob o RLS da loja dela.
      await setTenant(tx, { storeId: session.storeId, userId: session.userId });
      const [membership] = await tx
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(eq(memberships.userId, session.userId), eq(memberships.storeId, session.storeId)),
        )
        .limit(1);
      if (!membership) return null;

      return {
        sessionId: session.id,
        userId: session.userId,
        storeId: session.storeId,
        role: membership.role,
      };
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  }
}
