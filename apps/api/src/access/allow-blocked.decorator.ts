import { SetMetadata } from '@nestjs/common';

export const ALLOW_BLOCKED = 'allowBlocked';

/**
 * Rota que funciona mesmo com a loja bloqueada (teste vencido, assinatura inativa),
 * como /auth/me e /auth/logout. Ainda exige login.
 */
export const AllowBlocked = () => SetMetadata(ALLOW_BLOCKED, true);
