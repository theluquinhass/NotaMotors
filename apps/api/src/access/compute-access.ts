import type { AccessBlockReason, AccessInfo } from '@notamotors/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionSnapshot {
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
  manualGrant: boolean;
}

/**
 * Regra de acesso. `now` vem SEMPRE do relógio do banco, nunca do navegador.
 * Função pura: nada é gravado; a situação é recalculada a cada requisição.
 */
export function computeAccess(sub: SubscriptionSnapshot, now: Date): AccessInfo {
  const trialMsLeft = sub.trialEndsAt.getTime() - now.getTime();
  const base = {
    trialEndsAt: sub.trialEndsAt.toISOString(),
    trialDaysLeft: Math.max(0, Math.ceil(trialMsLeft / DAY_MS)),
  };
  const allow = (status: 'trial' | 'active' | 'manual'): AccessInfo => ({
    ...base,
    status,
    allowed: true,
    reason: null,
  });
  const block = (reason: AccessBlockReason): AccessInfo => ({
    ...base,
    status: 'blocked',
    allowed: false,
    reason,
  });

  if (sub.manualGrant) return allow('manual');

  switch (sub.status) {
    case 'active':
      // Sem data de fim do período, não libera (falha fechada).
      return sub.currentPeriodEnd && sub.currentPeriodEnd > now
        ? allow('active')
        : block('period_ended');
    case 'trialing':
      return trialMsLeft > 0 ? allow('trial') : block('trial_expired');
    case 'past_due':
      // Regra de carência ainda em aberto (CLAUDE.md): por enquanto bloqueia.
      return block('past_due');
    case 'canceled':
      return block('canceled');
  }
}
