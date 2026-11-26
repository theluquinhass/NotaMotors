import { pgEnum } from 'drizzle-orm/pg-core';

export const fiscalStatus = pgEnum('fiscal_status', ['incomplete', 'complete']);

export const membershipRole = pgEnum('membership_role', ['owner', 'seller']);

export const subscriptionStatus = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
]);

export const taxRegime = pgEnum('tax_regime', ['simples', 'regular']);
