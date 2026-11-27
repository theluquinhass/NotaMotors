import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Libera a rota sem login. Toda rota sem este decorator exige sessão válida. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
