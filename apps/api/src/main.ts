import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import {
  createSafeErrorResponse,
  HttpExceptionFilter,
} from './core/errors/http-exception.filter.js';
import { RequestIdMiddleware } from './core/logging/request-id.middleware.js';
import {
  configureApiRoutes,
  createOpenApiDocument,
  setupDevelopmentOpenApi,
} from './core/observability/openapi.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const requestIdMiddleware = new RequestIdMiddleware();
  const corsOrigins = configService.getOrThrow<readonly string[]>('corsOrigins');

  app.enableShutdownHooks();
  if (corsOrigins.length > 0) {
    app.enableCors({
      allowedHeaders: ['Content-Type', 'X-Request-Id'],
      credentials: false,
      exposedHeaders: ['X-Request-Id'],
      methods: ['GET'],
      origin: corsOrigins,
    });
  }
  app.useLogger(app.get(Logger));
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.useGlobalFilters(new HttpExceptionFilter());
  configureApiRoutes(app);

  if (configService.getOrThrow<string>('nodeEnv') === 'development') {
    const document = createOpenApiDocument(app);
    setupDevelopmentOpenApi(app, document);
  }

  await app.init();
  app.use(
    (
      request: {
        id?: string;
        log?: { error(object: Record<string, string | number>, message: string): void };
        method?: string;
      },
      response: {
        header(name: string, value: string): typeof response;
        json(body: unknown): unknown;
        status(code: number): typeof response;
      },
    ) => {
      const { body, error, requestId, status } = createSafeErrorResponse(
        new NotFoundException(),
        request.id,
      );
      request.log?.error(
        {
          category: error.category,
          method: request.method ?? 'unknown',
          requestId,
          route: 'unmatched',
          status,
        },
        'Request failed.',
      );
      response.status(status).header('X-Request-Id', requestId).json(body);
    },
  );

  await app.listen(configService.getOrThrow<number>('port'));
}

void bootstrap();
