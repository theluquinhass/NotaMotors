import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import type { StoreFiscalInput, StoreFiscalResponse, Uf } from '@notamotors/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { AuthContext } from '../auth/auth-context.js';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { isUniqueViolation } from '../db/errors.js';
import { storeTaxRegimes, stores } from '../db/schema/index.js';
import { withTenant, type Tx } from '../db/tenant.js';

/** "2026-03-01" → "01/03/2026" */
const br = (iso: string) => iso.split('-').reverse().join('/');

@Injectable()
export class StoreFiscalService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  get(auth: AuthContext): Promise<StoreFiscalResponse> {
    return withTenant(this.db, auth, (tx) => this.read(tx, auth.storeId));
  }

  async update(auth: AuthContext, input: StoreFiscalInput): Promise<StoreFiscalResponse> {
    try {
      return await withTenant(this.db, auth, async (tx) => {
        await tx
          .update(stores)
          .set({ cnpj: input.cnpj, stateRegistration: input.stateRegistration, uf: input.uf })
          .where(eq(stores.id, auth.storeId));

        await this.applyRegime(tx, auth, input.regime, input.regimeValidFrom);
        return this.read(tx, auth.storeId);
      });
    } catch (error) {
      if (isUniqueViolation(error, 'stores_cnpj_uq')) {
        throw new ConflictException('Este CNPJ já está cadastrado em outra loja do NotaMotors');
      }
      throw error;
    }
  }

  /**
   * Regime com vigência: o período em aberto é encerrado na data de início do novo.
   * Mesmo regime: nada muda. A constraint EXCLUDE no banco garante que não haja sobreposição.
   */
  private async applyRegime(
    tx: Tx,
    auth: AuthContext,
    regime: StoreFiscalInput['regime'],
    validFrom: string,
  ): Promise<void> {
    const [open] = await tx
      .select()
      .from(storeTaxRegimes)
      .where(and(eq(storeTaxRegimes.storeId, auth.storeId), isNull(storeTaxRegimes.validTo)))
      .limit(1);

    if (open?.regime === regime) return;

    if (open) {
      if (validFrom <= open.validFrom) {
        throw new BadRequestException({
          message: 'Dados inválidos',
          fields: {
            regimeValidFrom: [
              `A troca de regime precisa começar depois de ${br(open.validFrom)}, início do regime atual`,
            ],
          },
        });
      }
      await tx
        .update(storeTaxRegimes)
        .set({ validTo: validFrom })
        .where(eq(storeTaxRegimes.id, open.id));
    }

    await tx
      .insert(storeTaxRegimes)
      .values({ storeId: auth.storeId, regime, validFrom, createdBy: auth.userId });
  }

  private async read(tx: Tx, storeId: string): Promise<StoreFiscalResponse> {
    const [store] = await tx.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store) throw new Error('Loja do contexto não encontrada');

    const [regime] = await tx
      .select({ regime: storeTaxRegimes.regime, validFrom: storeTaxRegimes.validFrom })
      .from(storeTaxRegimes)
      .where(and(eq(storeTaxRegimes.storeId, storeId), isNull(storeTaxRegimes.validTo)))
      .orderBy(desc(storeTaxRegimes.validFrom))
      .limit(1);

    return {
      id: store.id,
      name: store.name,
      cnpj: store.cnpj,
      stateRegistration: store.stateRegistration,
      uf: store.uf as Uf | null,
      fiscalStatus: store.fiscalStatus,
      regime: regime ?? null,
      checklist: {
        cnpj: store.cnpj !== null,
        stateRegistration: store.stateRegistration !== null,
        regime: regime !== undefined,
        // Certificado digital: marco 2.
        certificate: false,
      },
    };
  }
}
