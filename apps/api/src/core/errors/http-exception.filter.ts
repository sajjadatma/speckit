import { randomUUID } from 'node:crypto';

import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';

import type { ApiErrorResponse } from './api-error.schema.js';

type RequestWithId = {
  id?: string;
  log?: { error(object: Record<string, string | number>, message: string): void };
  method?: string;
  route?: { path?: string };
};

type HttpResponse = {
  header(name: string, value: string): HttpResponse;
  json(body: ApiErrorResponse): unknown;
  status(code: number): HttpResponse;
};

type SafeError = ApiErrorResponse['error'];

const INTERNAL_ERROR: SafeError = {
  category: 'unexpected',
  code: 'INTERNAL_ERROR',
  message: 'An unexpected error occurred.',
};

const VALIDATION_ERROR: SafeError = {
  category: 'validation',
  code: 'VALIDATION_FAILED',
  message: 'Request validation failed.',
};

const APPLICATION_ERROR: SafeError = {
  category: 'application',
  code: 'APPLICATION_ERROR',
  message: 'The request could not be completed.',
};

const UUID_REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSafeError(exception: unknown): { error: SafeError; status: number } {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();

    return {
      error: status === 400 ? VALIDATION_ERROR : status >= 500 ? INTERNAL_ERROR : APPLICATION_ERROR,
      status,
    };
  }

  return { error: INTERNAL_ERROR, status: HttpStatus.INTERNAL_SERVER_ERROR };
}

export function createSafeErrorResponse(
  exception: unknown,
  suppliedRequestId: string | undefined,
): { body: ApiErrorResponse; error: SafeError; requestId: string; status: number } {
  const requestId =
    typeof suppliedRequestId === 'string' && UUID_REQUEST_ID_PATTERN.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();
  const { error, status } = getSafeError(exception);

  return { body: { error, requestId }, error, requestId, status };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<HttpResponse>();
    const { body, error, requestId, status } = createSafeErrorResponse(exception, request.id);
    const route = typeof request.route?.path === 'string' ? request.route.path : 'unmatched';

    request.log?.error(
      {
        category: error.category,
        method: request.method ?? 'unknown',
        requestId,
        route,
        status,
      },
      'Request failed.',
    );
    response.status(status).header('X-Request-Id', requestId).json(body);
  }
}
