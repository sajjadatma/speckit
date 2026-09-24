import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { NestFactory } from '@nestjs/core';

import type { AppModule } from '../src/app.module.js';
import type {
  configureApiRoutes as ConfigureApiRoutes,
  createOpenApiDocument as CreateOpenApiDocument,
} from '../src/core/observability/openapi.js';

type CompiledAppModule = { AppModule: typeof AppModule };
type CompiledOpenApiModule = {
  configureApiRoutes: typeof ConfigureApiRoutes;
  createOpenApiDocument: typeof CreateOpenApiDocument;
};

const artifactPath = fileURLToPath(new URL('../dist/openapi.json', import.meta.url));
const compiledAppModuleUrl = new URL('../dist/app.module.js', import.meta.url).href;
const compiledOpenApiModuleUrl = new URL('../dist/core/observability/openapi.js', import.meta.url)
  .href;

process.env.NODE_ENV ??= 'production';
process.env.PORT ??= '3001';

async function exportOpenApi(): Promise<void> {
  const { AppModule } = (await import(compiledAppModuleUrl)) as CompiledAppModule;
  const { configureApiRoutes, createOpenApiDocument } = (await import(
    compiledOpenApiModuleUrl
  )) as CompiledOpenApiModule;
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    configureApiRoutes(app);
    const document = createOpenApiDocument(app);
    await writeFile(artifactPath, `${JSON.stringify(document, null, 2)}\n`);
  } finally {
    await app.close();
  }
}

void exportOpenApi();
