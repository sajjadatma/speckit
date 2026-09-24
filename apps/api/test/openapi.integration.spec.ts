import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import type { ApiServer, ApiServerOptions } from './helpers/api-server.js';

type StartApiServer = (options?: ApiServerOptions) => Promise<ApiServer>;

const { startApiServer } = (await import(
  new URL('./helpers/api-server.ts', import.meta.url).href
)) as unknown as {
  startApiServer: StartApiServer;
};

const artifactPath = resolve(import.meta.dirname, '../dist/openapi.json');

function parseJson(body: string): unknown {
  return JSON.parse(body) as unknown;
}

void test('the production OpenAPI artifact is retained in the API build output', async () => {
  await access(artifactPath);
});

void test('development exposes interactive docs and the OpenAPI JSON route', async () => {
  const api = await startApiServer({ nodeEnv: 'development' });

  try {
    const [docs, openapi] = await Promise.all([api.get('/api/docs'), api.get('/api/openapi.json')]);
    assert.equal(docs.statusCode, 200);
    assert.equal(openapi.statusCode, 200);
  } finally {
    await api.stop();
  }
});

void test('production hides interactive docs and the HTTP OpenAPI JSON route', async () => {
  const api = await startApiServer({ nodeEnv: 'production' });

  try {
    const [docs, openapi] = await Promise.all([api.get('/api/docs'), api.get('/api/openapi.json')]);
    assert.equal(docs.statusCode, 404);
    assert.equal(openapi.statusCode, 404);
    for (const response of [docs, openapi]) {
      const payload = parseJson(response.body) as { error?: unknown; requestId?: unknown };
      assert.equal(typeof response.headers['x-request-id'], 'string');
      assert.deepEqual(Object.keys(payload).sort(), ['error', 'requestId']);
      assert.equal(payload.requestId, response.headers['x-request-id']);
      assert.ok(typeof payload.error === 'object' && payload.error !== null);
      assert.equal((payload.error as { category?: unknown }).category, 'application');
      assert.equal((payload.error as { code?: unknown }).code, 'APPLICATION_ERROR');
    }
  } finally {
    await api.stop();
  }
});
