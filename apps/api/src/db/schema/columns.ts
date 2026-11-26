import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';

/** Chave primária UUID v7 (ordenável por tempo), gerada pelo Postgres 18. */
export const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`);

/** Datas sempre em UTC (timestamptz). */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
