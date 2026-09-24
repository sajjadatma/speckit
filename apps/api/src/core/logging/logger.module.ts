import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { LoggerModule } from 'nestjs-pino';

type RequestWithRoute = IncomingMessage & {
  id?: string;
  route?: { path?: string };
};

type ResponseWithStatus = ServerResponse & { statusCode: number };

const UUID_REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getRequestId(value: string | string[] | undefined): string {
  return typeof value === 'string' && UUID_REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
}

function routeTemplate(request: RequestWithRoute): string {
  return typeof request.route?.path === 'string' ? request.route.path : 'unmatched';
}

function responseDuration(value: unknown): number {
  if (
    typeof value === 'object' &&
    value !== null &&
    'responseTime' in value &&
    typeof value.responseTime === 'number'
  ) {
    return value.responseTime;
  }

  return 0;
}

export const appLoggerModule = LoggerModule.forRoot<RequestWithRoute, ResponseWithStatus>({
  pinoHttp: {
    customAttributeKeys: { reqId: 'requestId' },
    customProps: (request) => ({ requestId: request.id }),
    customSuccessObject: (request, response, value: unknown) => ({
      duration: responseDuration(value),
      method: request.method,
      requestId: request.id,
      route: routeTemplate(request),
      status: response.statusCode,
    }),
    genReqId: (request) => getRequestId(request.headers['x-request-id']),
    quietReqLogger: true,
    quietResLogger: true,
    redact: {
      paths: [
        'req',
        'res',
        'err',
        'request.headers.authorization',
        'request.headers.cookie',
        'request.body',
        'request.query',
        'request.url',
      ],
      remove: true,
    },
    serializers: {
      err: () => undefined,
      req: () => undefined,
      res: () => undefined,
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  },
});
