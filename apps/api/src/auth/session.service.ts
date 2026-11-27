import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { memberships, sessions } from '../db/schema/index.js';
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
    const [row] = await this.db
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        storeId: sessions.storeId,
        role: memberships.role,
      })
      .from(sessions)
      .innerJoin(
        memberships,
        and(eq(memberships.userId, sessions.userId), eq(memberships.storeId, sessions.storeId)),
      )
      .where(
        and(
          eq(sessions.tokenHash, hashToken(token)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`now()`),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  }
}
