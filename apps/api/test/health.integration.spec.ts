import assert from 'node:assert/strict';
import test from 'node:test';

import type { ApiServer, ApiServerOptions } from './helpers/api-server.js';

type StartApiServer = (options?: ApiServerOptions) => Promise<ApiServer>;

const { startApiServer } = (await import(
  new URL('./helpers/api-server.ts', import.meta.url).href
)) as unknown as {
  startApiServer: StartApiServer;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseJson(body: string): unknown {
  return JSON.parse(body) as unknown;
}

function assertRequestId(value: string | string[] | undefined): asserts value is string {
  if (typeof value !== 'string') {
    assert.fail('Expected a single X-Request-Id response header.');
  }
  assert.match(value, uuidPattern);
}

void test('GET /health/live returns live and a UUID while the configured database is unreachable', async () => {
  const api = await startApiServer();

  try {
    const response = await api.get('/health/live');
    assert.equal(response.statusCode, 200);
    assertRequestId(response.headers['x-request-id']);
    assert.deepEqual(parseJson(response.body), {
      requestId: response.headers['x-request-id'],
      status: 'live',
    });
  } finally {
    await api.stop();
  }
});

void test('GET /health/ready reports a safe not-ready result for the synthetic unreachable database', async () => {
  const api = await startApiServer();

  try {
    const response = await api.get('/health/ready');
    assert.equal(response.statusCode, 503);
    assertRequestId(response.headers['x-request-id']);
    assert.deepEqual(parseJson(response.body), {
      database: 'down',
      requestId: response.headers['x-request-id'],
      status: 'not_ready',
    });
    assert.doesNotMatch(response.body, /synthetic_user|synthetic_db|127\.0\.0\.1:1|postgresql:/i);
  } finally {
    await api.stop();
  }
});

void test(
  'GET /health/ready reports ready only when TEST_DATABASE_URL is supplied',
  {
    skip:
      process.env.TEST_DATABASE_URL === undefined
        ? 'TEST_DATABASE_URL is absent; readiness-up integration is intentionally skipped.'
        : false,
  },
  async () => {
    const api = await startApiServer({
      databaseUrl: process.env.TEST_DATABASE_URL,
    });

    try {
      const response = await api.get('/health/ready');
      assert.equal(response.statusCode, 200);
      assertRequestId(response.headers['x-request-id']);
      assert.deepEqual(parseJson(response.body), {
        database: 'up',
        requestId: response.headers['x-request-id'],
        status: 'ready',
      });
    } finally {
      await api.stop();
    }
  },
);
