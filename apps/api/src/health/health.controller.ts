import { Controller, Get } from '@nestjs/common';
import { PRODUCT_NAME } from '@notamotors/shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; service: string } {
    return { status: 'ok', service: PRODUCT_NAME };
  }
}
