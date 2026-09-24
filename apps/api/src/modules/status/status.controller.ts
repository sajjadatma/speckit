import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  apiErrorResponseSwaggerSchema,
  statusQuerySchema,
  statusQuerySwaggerSchema,
} from '../../core/index.js';
import {
  statusSuccessSwaggerSchema,
  StatusService,
  type StatusResponse,
} from './status.service.js';

type RequestWithBody = {
  body?: unknown;
};

const requestIdResponseHeader = {
  'X-Request-Id': {
    description: 'Server-generated correlation identifier for the handled request.',
    schema: { format: 'uuid', type: 'string' },
  },
} as const;

@ApiTags('Foundation')
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @ApiOperation({
    description: 'Explicitly public. No credentials or business data.',
    operationId: 'getFoundationStatus',
    summary: 'Neutral application status for baseline API integration',
  })
  @ApiQuery({
    description: 'The only supported representation; defaults to summary.',
    name: 'format',
    required: false,
    schema: statusQuerySwaggerSchema as never,
  })
  @ApiOkResponse({
    description: 'Baseline operation succeeded',
    headers: requestIdResponseHeader,
    schema: statusSuccessSwaggerSchema as never,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request input; error.category=validation and error.code=VALIDATION_FAILED.',
    headers: requestIdResponseHeader,
    schema: apiErrorResponseSwaggerSchema as never,
  })
  @ApiInternalServerErrorResponse({
    description:
      'Unexpected internal failure; error.category=unexpected and error.code=INTERNAL_ERROR.',
    headers: requestIdResponseHeader,
    schema: apiErrorResponseSwaggerSchema as never,
  })
  getStatus(@Query() query: unknown, @Req() request: RequestWithBody): StatusResponse {
    const parsedQuery = statusQuerySchema.safeParse(query);

    if (!parsedQuery.success || request.body !== undefined) {
      throw new BadRequestException();
    }

    return this.statusService.getStatus();
  }
}
