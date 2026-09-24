import { Injectable, Optional } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client.js';

function validatedDatabaseUrl(value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new Error('Invalid database configuration');
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      throw new Error('Invalid database configuration');
    }
  } catch {
    throw new Error('Invalid database configuration');
  }

  return value;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Optional() configService?: ConfigService) {
    const databaseUrl = validatedDatabaseUrl(
      configService?.get<string>('databaseUrl') ?? process.env.DATABASE_URL,
    );

    super({ adapter: new PrismaPg(databaseUrl) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
