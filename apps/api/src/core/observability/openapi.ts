import { RequestMethod, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

const API_GLOBAL_PREFIX = 'api/v1';

const openApiConfig = new DocumentBuilder()
  .setOpenAPIVersion('3.0.3')
  .setTitle('Platform Foundation API (design contract)')
  .setVersion('0.1.0')
  .addServer('http://localhost:3001')
  .build();

export function configureApiRoutes(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, openApiConfig, { ignoreGlobalPrefix: false });
}

export function setupDevelopmentOpenApi(app: INestApplication, document: OpenAPIObject): void {
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/openapi.json',
    raw: ['json'],
    swaggerUiEnabled: true,
    useGlobalPrefix: false,
  });
}
