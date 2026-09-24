import { randomUUID } from 'node:crypto';

import type { IncomingMessage, ServerResponse } from 'node:http';

import type { NestMiddleware } from '@nestjs/common';

type NextFunction = () => void;
type RequestWithId = IncomingMessage & { id?: string };

const UUID_REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getRequestId(value: string | string[] | undefined): string {
  return typeof value === 'string' && UUID_REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
}

export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: ServerResponse, next: NextFunction): void {
    const requestId = getRequestId(request.headers['x-request-id']);

    request.id = requestId;
    response.setHeader('X-Request-Id', requestId);
    next();
  }
}
