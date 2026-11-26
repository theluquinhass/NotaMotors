/** Erro do Postgres, esteja ele direto ou embrulhado pelo Drizzle (em `cause`). */
export interface PgError {
  code?: string;
  constraint?: string;
}

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_CHECK_VIOLATION = '23514';
export const PG_EXCLUSION_VIOLATION = '23P01';

export function asPgError(error: unknown): PgError {
  const e = error as PgError & { cause?: PgError };
  return e.cause?.code ? e.cause : e;
}

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const pg = asPgError(error);
  return pg.code === PG_UNIQUE_VIOLATION && pg.constraint === constraint;
}
