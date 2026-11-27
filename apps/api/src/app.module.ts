import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './db/database.module.js';
import { HealthController } from './health/health.controller.js';
import { StoresModule } from './stores/stores.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, StoresModule],
  controllers: [HealthController],
})
export class AppModule {}
