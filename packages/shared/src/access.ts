/** Situação de acesso da loja, sempre calculada pelo servidor. */
export type AccessStatus = 'trial' | 'active' | 'manual' | 'blocked';

export type AccessBlockReason = 'trial_expired' | 'past_due' | 'canceled' | 'period_ended';

export interface AccessInfo {
  status: AccessStatus;
  allowed: boolean;
  reason: AccessBlockReason | null;
  /** ISO 8601 em UTC. */
  trialEndsAt: string;
  /** Dias de teste restantes (arredondado para cima, mínimo 0), pelo relógio do servidor. */
  trialDaysLeft: number;
}

/** Mensagens mostradas na API (402) e na tela de checkout. */
export const ACCESS_BLOCK_MESSAGES: Record<AccessBlockReason, string> = {
  trial_expired: 'Seu teste grátis terminou. Assine para continuar usando o NotaMotors.',
  past_due: 'Há um pagamento pendente. Regularize para continuar usando o NotaMotors.',
  canceled: 'Sua assinatura foi cancelada. Assine novamente para continuar.',
  period_ended: 'Sua assinatura venceu. Renove para continuar usando o NotaMotors.',
};

/** Código do erro 402 quando a loja está bloqueada; o front leva para /checkout. */
export const ACCESS_BLOCKED = 'ACCESS_BLOCKED';

export interface AccessBlockedError {
  statusCode: 402;
  code: typeof ACCESS_BLOCKED;
  reason: AccessBlockReason;
  message: string;
}

export interface CurrentStoreResponse {
  id: string;
  name: string;
  fiscalStatus: 'incomplete' | 'complete';
  cnpj: string | null;
  uf: string | null;
}
