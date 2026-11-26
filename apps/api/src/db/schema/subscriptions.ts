import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { subscriptionStatus } from './enums.js';
import { stores } from './stores.js';

/**
 * Uma assinatura por loja. O acesso (liberado ou bloqueado) NUNCA é gravado:
 * o servidor calcula a cada requisição a partir destes campos e do relógio dele.
 */
export const subscriptions = pgTable('subscriptions', {
  id: id(),
  storeId: uuid('store_id')
    .notNull()
    .unique('subscriptions_store_uq')
    .references(() => stores.id),
  status: subscriptionStatus('status').notNull().default('trialing'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  // Loja piloto liberada manualmente, sem pagamento.
  manualGrant: boolean('manual_grant').notNull().default(false),
  // Preenchidos no marco 2, quando houver gateway.
  gateway: text('gateway'),
  gatewayCustomerId: text('gateway_customer_id'),
  gatewaySubscriptionId: text('gateway_subscription_id'),
  ...timestamps,
});
