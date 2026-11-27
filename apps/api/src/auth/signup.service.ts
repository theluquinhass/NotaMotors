import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { TRIAL_DAYS, type SignupInput, type SignupResponse } from '@notamotors/shared';
import argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { isUniqueViolation } from '../db/errors.js';
import { setTenant } from '../db/tenant.js';
import { memberships, stores, subscriptions, users } from '../db/schema/index.js';

@Injectable()
export class SignupService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Cria, numa única transação, usuário, loja, vínculo de dono e assinatura em teste.
   * Se qualquer passo falhar, nada fica gravado.
   */
  async signup(input: SignupInput): Promise<SignupResponse> {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({ name: input.name, email: input.email, passwordHash })
          .returning({ id: users.id });

        // O RLS só deixa gravar a loja do contexto: gera o id antes e aplica o contexto.
        const { rows } = await tx.execute<{ id: string }>(sql`select uuidv7() as id`);
        await setTenant(tx, { storeId: rows[0]!.id, userId: user!.id });

        const [store] = await tx
          .insert(stores)
          .values({ id: rows[0]!.id, name: input.storeName, createdBy: user!.id })
          .returning({ id: stores.id });

        await tx
          .insert(memberships)
          .values({ storeId: store!.id, userId: user!.id, role: 'owner', createdBy: user!.id });

        // Fim do teste calculado pelo relógio do banco, nunca pelo do navegador.
        const [subscription] = await tx
          .insert(subscriptions)
          .values({
            storeId: store!.id,
            status: 'trialing',
            trialEndsAt: sql`now() + make_interval(days => ${TRIAL_DAYS})`,
          })
          .returning({ trialEndsAt: subscriptions.trialEndsAt });

        return {
          userId: user!.id,
          storeId: store!.id,
          trialEndsAt: subscription!.trialEndsAt.toISOString(),
        };
      });
    } catch (error) {
      if (isUniqueViolation(error, 'users_email_lower_uq')) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
      throw error;
    }
  }
}
