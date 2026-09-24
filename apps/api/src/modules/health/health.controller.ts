import { Controller, Get, HttpCode, Req, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { HealthService, type ReadinessResponse } from './health.service.js';

type RequestWithId = { id: string };
type ResponseWithStatus = { status(statusCode: number): void };

type LivenessResponse = {
  requestId: string;
  status: 'live';
};

const requestIdResponseHeader = {
  'X-Request-Id': {
    description: 'Server-generated correlation identifier for the handled request.',
    schema: { format: 'uuid', type: 'string' },
  },
} as const;

const livenessSwaggerSchema = {
  additionalProperties: false,
  properties: {
    requestId: { format: 'uuid', type: 'string' },
    status: { enum: ['live'], type: 'string' },
  },
  required: ['status', 'requestId'],
  type: 'object',
};

const readinessSwaggerSchema = {
  additionalProperties: false,
  description: 'HTTP 200 iff status=ready and database=up; otherwise HTTP 503.',
  properties: {
    database: { enum: ['up', 'down'], type: 'string' },
    requestId: { format: 'uuid', type: 'string' },
    status: { enum: ['ready', 'not_ready'], type: 'string' },
  },
  required: ['status', 'database', 'requestId'],
  type: 'object',
};

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @HttpCode(200)
  @ApiOperation({
    description: 'Explicitly public; does not reveal configuration.',
    operationId: 'getLiveness',
    summary: 'Process liveness, independent of database connectivity',
  })
  @ApiOkResponse({
    description: 'Process is serving HTTP',
    headers: requestIdResponseHeader,
    schema: livenessSwaggerSchema,
  })
  getLiveness(@Req() request: RequestWithId): LivenessResponse {
    return { requestId: request.id, status: 'live' };
  }

  @Get('ready')
  @ApiOperation({
    description: 'Explicitly public; never reveals connection details.',
    operationId: 'getReadiness',
    summary: 'Readiness including a real database connectivity check',
  })
  @ApiOkResponse({
    description: 'Ready to serve dependent requests',
    headers: requestIdResponseHeader,
    schema: readinessSwaggerSchema,
  })
  @ApiServiceUnavailableResponse({
    description: 'Required database is unavailable',
    headers: requestIdResponseHeader,
    schema: readinessSwaggerSchema,
  })
  async getReadiness(
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: ResponseWithStatus,
  ): Promise<ReadinessResponse> {
    const readiness = await this.healthService.getReadiness(request.id);

    if (readiness.status === 'not_ready') {
      response.status(503);
    }

    return readiness;
  }
}
