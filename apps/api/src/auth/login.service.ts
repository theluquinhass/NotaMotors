import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { LoginInput, MeResponse } from '@notamotors/shared';
import argon2 from 'argon2';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { memberships, stores, users } from '../db/schema/index.js';

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos';

@Injectable()
export class LoginService {
  // Hash descartável: quando o e-mail não existe, a verificação gasta o mesmo tempo,
  // para não revelar pela demora quais e-mails estão cadastrados.
  private dummyHash?: Promise<string>;

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Confere e-mail e senha e devolve o usuário com a loja que a sessão vai usar. */
  async verifyCredentials(input: LoginInput): Promise<{ userId: string; storeId: string }> {
    const [user] = await this.db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(sql`lower(${users.email})`, input.email))
      .limit(1);

    if (!user) {
      this.dummyHash ??= argon2.hash('senha-ficticia-para-tempo-constante');
      await argon2.verify(await this.dummyHash, input.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!(await argon2.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Hoje cada usuário tem uma loja; com várias, entra a escolha de loja.
    const [membership] = await this.db
      .select({ storeId: memberships.storeId })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .orderBy(asc(memberships.createdAt))
      .limit(1);

    if (!membership) throw new UnauthorizedException('Usuário sem loja vinculada');

    return { userId: user.id, storeId: membership.storeId };
  }

  async me(userId: string, storeId: string): Promise<MeResponse> {
    const [row] = await this.db
      .select({
        userId: users.id,
        userName: users.name,
        email: users.email,
        storeId: stores.id,
        storeName: stores.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .innerJoin(stores, eq(stores.id, memberships.storeId))
      .where(and(eq(memberships.userId, userId), eq(memberships.storeId, storeId)))
      .limit(1);

    if (!row) throw new UnauthorizedException('Faça login para continuar');

    return {
      user: { id: row.userId, name: row.userName, email: row.email },
      store: { id: row.storeId, name: row.storeName },
      role: row.role,
    };
  }
}
