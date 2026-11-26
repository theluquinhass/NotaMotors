import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/** Valida e normaliza o corpo da requisição com um schema Zod de @notamotors/shared. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos',
        fields: z.flattenError(result.error).fieldErrors,
      });
    }
    return result.data;
  }
}
