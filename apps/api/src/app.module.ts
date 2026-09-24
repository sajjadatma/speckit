import { Module } from '@nestjs/common';

import { appConfigModule } from './core/index.js';
import { appLoggerModule } from './core/logging/logger.module.js';
import { HealthModule, StatusModule } from './modules/index.js';

@Module({
  imports: [appConfigModule, appLoggerModule, HealthModule, StatusModule],
})
export class AppModule {}
