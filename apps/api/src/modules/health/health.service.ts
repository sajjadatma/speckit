import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../core/index.js';

export type ReadinessStatus = 'ready' | 'not_ready';

export type ReadinessResponse = {
  database: 'up' | 'down';
  requestId: string;
  status: ReadinessStatus;
};

const READINESS_TIMEOUT_MS = 1_000;

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getReadiness(requestId: string): Promise<ReadinessResponse> {
    let timeout: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Readiness check timed out.')),
            READINESS_TIMEOUT_MS,
          );
        }),
      ]);

      return { database: 'up', requestId, status: 'ready' };
    } catch {
      return { database: 'down', requestId, status: 'not_ready' };
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }
}
