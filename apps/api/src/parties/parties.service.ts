import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PARTIES_PAGE_SIZE,
  type PartyInput,
  type PartyListResponse,
  type PartyResponse,
  type Uf,
} from '@notamotors/shared';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import type { AuthContext } from '../auth/auth-context.js';
import { isUuid } from '../common/uuid.js';
import type { Database } from '../db/client.js';
import { DATABASE } from '../db/database.module.js';
import { isUniqueViolation } from '../db/errors.js';
import { parties } from '../db/schema/index.js';
import { withTenant } from '../db/tenant.js';

type PartyRow = typeof parties.$inferSelect;

const NOT_FOUND = 'Pessoa não encontrada';
const DUPLICATE = 'Já existe uma pessoa com este CPF/CNPJ nesta loja';

function toResponse(row: PartyRow): PartyResponse {
  // storeId e createdBy não saem da API.
  return {
    id: row.id,
    kind: row.kind,
    document: row.document,
    name: row.name,
    tradeName: row.tradeName,
    isMei: row.isMei,
    companyTaxRegime: row.companyTaxRegime,
    stateRegistration: row.stateRegistration,
    email: row.email,
    phone: row.phone,
    postalCode: row.postalCode,
    street: row.street,
    number: row.number,
    complement: row.complement,
    district: row.district,
    city: row.city,
    cityIbgeCode: row.cityIbgeCode,
    notes: row.notes,
    uf: row.uf as Uf | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Escapa curingas do LIKE para a busca do usuário ser literal. */
const likeLiteral = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

@Injectable()
export class PartiesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Lista da loja, por nome; busca por nome, nome fantasia ou início do CPF/CNPJ. */
  list(auth: AuthContext, q: string, page: number): Promise<PartyListResponse> {
    return withTenant(this.db, auth, async (tx) => {
      const term = q.trim();
      const documentTerm = term.replace(/[.\-/\s]/g, '').toUpperCase();
      const filter = term
        ? or(
            ilike(parties.name, `%${likeLiteral(term)}%`),
            ilike(parties.tradeName, `%${likeLiteral(term)}%`),
            documentTerm ? ilike(parties.document, `${likeLiteral(documentTerm)}%`) : undefined,
          )
        : undefined;
      const where = and(eq(parties.storeId, auth.storeId), filter);

      const [rows, [count]] = await Promise.all([
        tx
          .select()
          .from(parties)
          .where(where)
          .orderBy(asc(parties.name), asc(parties.id))
          .limit(PARTIES_PAGE_SIZE)
          .offset((page - 1) * PARTIES_PAGE_SIZE),
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(parties)
          .where(where),
      ]);

      return { items: rows.map(toResponse), total: count!.n, page, pageSize: PARTIES_PAGE_SIZE };
    });
  }

  get(auth: AuthContext, id: string): Promise<PartyResponse> {
    if (!isUuid(id)) throw new NotFoundException(NOT_FOUND);
    return withTenant(this.db, auth, async (tx) => {
      const [row] = await tx
        .select()
        .from(parties)
        .where(and(eq(parties.storeId, auth.storeId), eq(parties.id, id)))
        .limit(1);
      if (!row) throw new NotFoundException(NOT_FOUND);
      return toResponse(row);
    });
  }

  async create(auth: AuthContext, input: PartyInput): Promise<PartyResponse> {
    try {
      return await withTenant(this.db, auth, async (tx) => {
        const [row] = await tx
          .insert(parties)
          .values({ ...input, storeId: auth.storeId, createdBy: auth.userId })
          .returning();
        return toResponse(row!);
      });
    } catch (error) {
      if (isUniqueViolation(error, 'parties_store_document_uq')) {
        throw new ConflictException(DUPLICATE);
      }
      throw error;
    }
  }

  async update(auth: AuthContext, id: string, input: PartyInput): Promise<PartyResponse> {
    if (!isUuid(id)) throw new NotFoundException(NOT_FOUND);
    try {
      return await withTenant(this.db, auth, async (tx) => {
        const [row] = await tx
          .update(parties)
          .set(input)
          .where(and(eq(parties.storeId, auth.storeId), eq(parties.id, id)))
          .returning();
        if (!row) throw new NotFoundException(NOT_FOUND);
        return toResponse(row);
      });
    } catch (error) {
      if (isUniqueViolation(error, 'parties_store_document_uq')) {
        throw new ConflictException(DUPLICATE);
      }
      throw error;
    }
  }
}
