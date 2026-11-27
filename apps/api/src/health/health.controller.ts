import { Controller, Get } from '@nestjs/common';
import { PRODUCT_NAME } from '@notamotors/shared';
import { Public } from '../auth/public.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok'; service: string } {
    return { status: 'ok', service: PRODUCT_NAME };
  }
}
