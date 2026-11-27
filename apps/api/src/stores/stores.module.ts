import { Module } from '@nestjs/common';
import { StoreFiscalService } from './store-fiscal.service.js';
import { StoresController } from './stores.controller.js';

@Module({ controllers: [StoresController], providers: [StoreFiscalService] })
export class StoresModule {}
