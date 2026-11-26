import 'reflect-metadata';
import { createApp } from './app.js';

try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {
  // Sem .env: usa as variáveis do ambiente (produção).
}

const app = await createApp();
await app.listen(Number(process.env.PORT ?? 3000));
