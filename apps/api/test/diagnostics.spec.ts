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

function assertUuid(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    assert.fail('Expected a UUID.');
  }
  assert.match(value, uuidPattern);
}

function isStructuredLogLine(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function structuredLogLines(stdout: string): Array<Record<string, unknown>> {
  return stdout
    .split('\n')
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as unknown;
        return isStructuredLogLine(parsed) ? [parsed] : [];
      } catch {
        return [];
      }
    });
}

async function waitForCorrelatedRequestLog(api: ApiServer, requestId: string): Promise<string> {
  const deadline = Date.now() + 1_000;
  let stdout = '';

  do {
    stdout = api.readStdout();
    if (structuredLogLines(stdout).some((line) => line.requestId === requestId)) {
      return stdout;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  } while (Date.now() < deadline);

  throw new Error(`Timed out waiting for structured request log correlated to ${requestId}.`);
}

void test('request-id middleware echoes a supplied valid UUID', async () => {
  const module = (await import(
    new URL('../src/core/logging/request-id.middleware.ts', import.meta.url).href
  )) as {
    RequestIdMiddleware: new () => {
      use(
        request: { headers: Record<string, string>; id?: string },
        response: { setHeader(name: string, value: string): void },
        next: () => void,
      ): void;
    };
  };
  const requestId = '550e8400-e29b-41d4-a716-446655440000';
  const responseHeaders = new Map<string, string>();

  new module.RequestIdMiddleware().use(
    { headers: { 'x-request-id': requestId } },
    { setHeader: (name, value) => responseHeaders.set(name, value) },
    () => undefined,
  );

  assert.equal(responseHeaders.get('X-Request-Id'), requestId);
});

for (const suppliedRequestId of [undefined, 'not-a-uuid'] as const) {
  void test(`request-id middleware replaces ${String(suppliedRequestId)} with a UUID`, async () => {
    const module = (await import(
      new URL('../src/core/logging/request-id.middleware.ts', import.meta.url).href
    )) as {
      RequestIdMiddleware: new () => {
        use(
          request: { headers: Record<string, string | undefined>; id?: string },
          response: { setHeader(name: string, value: string): void },
          next: () => void,
        ): void;
      };
    };
    const responseHeaders = new Map<string, string>();

    new module.RequestIdMiddleware().use(
      { headers: { 'x-request-id': suppliedRequestId } },
      { setHeader: (name, value) => responseHeaders.set(name, value) },
      () => undefined,
    );

    assertUuid(responseHeaders.get('X-Request-Id'));
    assert.notEqual(responseHeaders.get('X-Request-Id'), suppliedRequestId);
  });
}

void test('validation failure has a bounded public payload and does not reflect PII, body, query, or connection URL', async () => {
  const api = await startApiServer({ captureStdout: true });
  const email = 'person@example.test';
  const databaseUrl = 'postgresql://diagnostic_user:***@db.example.test:5432/foundation';

  try {
    const response = await api.request({
      body: JSON.stringify({ email, databaseUrl, password: 'diagnostic-password' }),
      method: 'GET',
      path: `/api/v1/status?unknown=${encodeURIComponent(email)}&databaseUrl=${encodeURIComponent(databaseUrl)}`,
    });
    const payload = parseJson(response.body) as { error?: unknown; requestId?: unknown };
    assertUuid(response.headers['x-request-id']);
    const capturedStdout = await waitForCorrelatedRequestLog(api, response.headers['x-request-id']);
    const correlatedLog = structuredLogLines(capturedStdout).find(
      (line) => line.requestId === response.headers['x-request-id'],
    );

    assert.equal(response.statusCode, 400);
    assert.deepEqual(Object.keys(payload).sort(), ['error', 'requestId']);
    assert.equal(payload.requestId, response.headers['x-request-id']);
    assert.ok(typeof payload.error === 'object' && payload.error !== null);
    assert.deepEqual(Object.keys(payload.error).sort(), ['category', 'code', 'message']);
    assert.equal((payload.error as { category?: unknown }).category, 'validation');
    assert.equal((payload.error as { code?: unknown }).code, 'VALIDATION_FAILED');
    assert.doesNotMatch(
      response.body,
      /person@example\.test|diagnostic-password|diagnostic_user|db\.example\.test|postgresql:/i,
    );
    assert.ok(correlatedLog, 'Expected a structured log line for the validation response.');
    assert.equal(correlatedLog.method, 'GET');
    assert.equal(correlatedLog.requestId, response.headers['x-request-id']);
    assert.equal(correlatedLog.route, '/api/v1/status');
    assert.equal(correlatedLog.status, 400);
    assert.doesNotMatch(
      capturedStdout,
      /person@example\.test|diagnostic-password|diagnostic_user|db\.example\.test|postgresql:/i,
    );
  } finally {
    await api.stop();
  }
});

void test('unexpected exceptions have a bounded, correlated public payload without raw exception text', async () => {
  const module = (await import(
    new URL('../dist/core/errors/http-exception.filter.js', import.meta.url).href
  )) as {
    HttpExceptionFilter: new () => {
      catch(exception: Error, host: { switchToHttp(): unknown }): void;
    };
  };
  const requestId = '550e8400-e29b-41d4-a716-446655440000';
  const response = {
    body: undefined as unknown,
    header: () => response,
    json(body: unknown) {
      this.body = body;
      return this;
    },
    status: () => response,
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: requestId }),
      getResponse: () => response,
    }),
  };

  new module.HttpExceptionFilter().catch(
    new Error('postgresql://diagnostic_user:diagnostic_password@db.example.test:5432/foundation'),
    host,
  );

  assert.deepEqual(response.body, {
    error: {
      category: 'unexpected',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
    requestId,
  });
});
