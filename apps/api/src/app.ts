import { type INestApplication, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/** Monta a aplicação com a mesma configuração em produção e nos testes. */
export async function createApp(
  options: { logger?: LogLevel[] | false } = {},
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: options.logger });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}
