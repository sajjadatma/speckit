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
    throw new Error('Expected a single response X-Request-Id value.');
  }

  assert.match(value, uuidPattern);
}

void test('GET /api/v1/status defaults to summary and returns the frozen success payload', async () => {
  const api = await startApiServer();

  try {
    const response = await api.get('/api/v1/status');
    assert.equal(response.statusCode, 200);
    assertRequestId(response.headers['x-request-id']);
    assert.deepEqual(parseJson(response.body), { data: { status: 'operational' } });
  } finally {
    await api.stop();
  }
});

void test('GET /api/v1/status accepts format=summary with the frozen success payload', async () => {
  const api = await startApiServer();

  try {
    const response = await api.get('/api/v1/status?format=summary');
    assert.equal(response.statusCode, 200);
    assertRequestId(response.headers['x-request-id']);
    assert.deepEqual(parseJson(response.body), { data: { status: 'operational' } });
  } finally {
    await api.stop();
  }
});

for (const query of ['format=private_sentinel', 'unknown=unknown_sentinel'] as const) {
  void test(`GET /api/v1/status?${query} rejects unsupported input safely`, async () => {
    const api = await startApiServer();

    try {
      const response = await api.get(`/api/v1/status?${query}`);
      const payload = parseJson(response.body);
      assert.equal(response.statusCode, 400);
      assertRequestId(response.headers['x-request-id']);
      assert.ok(typeof payload === 'object' && payload !== null);
      assert.deepEqual(Object.keys(payload).sort(), ['error', 'requestId']);
      const error = (payload as { error: unknown }).error;
      assert.ok(typeof error === 'object' && error !== null);
      assert.equal((error as { category?: unknown }).category, 'validation');
      assert.equal((error as { code?: unknown }).code, 'VALIDATION_FAILED');
      assert.equal(typeof (error as { message?: unknown }).message, 'string');
      assert.equal((payload as { requestId: unknown }).requestId, response.headers['x-request-id']);
      assert.doesNotMatch(response.body, /private_sentinel|unknown_sentinel/i);
    } finally {
      await api.stop();
    }
  });
}

void test('GET /api/v1/status rejects a request body safely', async () => {
  const api = await startApiServer();

  try {
    const response = await api.request({
      body: JSON.stringify({ format: 'summary' }),
      method: 'GET',
      path: '/api/v1/status',
    });
    const payload = parseJson(response.body);
    assert.equal(response.statusCode, 400);
    assertRequestId(response.headers['x-request-id']);
    assert.ok(typeof payload === 'object' && payload !== null);
    assert.deepEqual(Object.keys(payload).sort(), ['error', 'requestId']);
    const error = (payload as { error: unknown }).error;
    assert.ok(typeof error === 'object' && error !== null);
    assert.equal((error as { category?: unknown }).category, 'validation');
    assert.equal((error as { code?: unknown }).code, 'VALIDATION_FAILED');
    assert.equal(typeof (error as { message?: unknown }).message, 'string');
    assert.equal((payload as { requestId: unknown }).requestId, response.headers['x-request-id']);
    assert.doesNotMatch(response.body, /"summary"/);
  } finally {
    await api.stop();
  }
});

for (const nodeEnv of ['development', 'production'] as const) {
  void test(`unmatched routes use the safe 404 response contract in ${nodeEnv}`, async () => {
    const api = await startApiServer({ nodeEnv });

    try {
      const response = await api.get('/unknown-route');
      const payload = parseJson(response.body) as { error?: unknown; requestId?: unknown };
      assert.equal(response.statusCode, 404);
      assertRequestId(response.headers['x-request-id']);
      assert.deepEqual(Object.keys(payload).sort(), ['error', 'requestId']);
      assert.equal(payload.requestId, response.headers['x-request-id']);
      assert.ok(typeof payload.error === 'object' && payload.error !== null);
      assert.deepEqual(Object.keys(payload.error).sort(), ['category', 'code', 'message']);
      assert.equal((payload.error as { category?: unknown }).category, 'application');
      assert.equal((payload.error as { code?: unknown }).code, 'APPLICATION_ERROR');
      assert.equal(typeof (payload.error as { message?: unknown }).message, 'string');
      assert.doesNotMatch(response.body, /Cannot GET|unknown-route/i);
    } finally {
      await api.stop();
    }
  });
}

void test('unexpected exceptions use the safe 500 response contract', async () => {
  const moduleUrl = new URL('../dist/core/errors/http-exception.filter.js', import.meta.url).href;
  const module = (await import(moduleUrl)) as {
    HttpExceptionFilter: new () => {
      catch(exception: Error, host: { switchToHttp(): unknown }): void;
    };
  };
  const requestId = '550e8400-e29b-41d4-a716-446655440000';
  const response = {
    body: undefined as unknown,
    header(name: string, value: string) {
      assert.equal(name, 'X-Request-Id');
      assert.equal(value, requestId);
      return this;
    },
    status(code: number) {
      assert.equal(code, 500);
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: requestId }),
      getResponse: () => response,
    }),
  };

  new module.HttpExceptionFilter().catch(new Error('exception-test-sentinel'), host);

  assert.ok(typeof response.body === 'object' && response.body !== null);
  assert.deepEqual(Object.keys(response.body).sort(), ['error', 'requestId']);
  const error = (response.body as { error: unknown }).error;
  assert.ok(typeof error === 'object' && error !== null);
  assert.equal((error as { category?: unknown }).category, 'unexpected');
  assert.equal((error as { code?: unknown }).code, 'INTERNAL_ERROR');
  assert.equal(typeof (error as { message?: unknown }).message, 'string');
  assert.equal((response.body as { requestId: unknown }).requestId, requestId);
  assert.doesNotMatch(JSON.stringify(response.body), /exception-test-sentinel/);
});
