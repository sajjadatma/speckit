import assert from 'node:assert/strict';
import test from 'node:test';

type ApiClientModule = {
  createApiClient(
    this: void,
    input: {
      apiOrigin: string;
      fetchImpl?: typeof fetch;
    },
  ): {
    getFoundationStatus(this: void): Promise<unknown>;
  };
  ApiClientError: new (input: unknown) => Error & { category: string };
};

type ApiErrorModule = {
  classifyApiError(error: unknown): Error & { category: string };
};

async function loadApiClient(): Promise<ApiClientModule> {
  const moduleUrl = new URL('../src/lib/api/client.ts', import.meta.url).href;
  return (await import(moduleUrl)) as ApiClientModule;
}

async function loadApiErrors(): Promise<ApiErrorModule> {
  const moduleUrl = new URL('../src/lib/api/errors.ts', import.meta.url).href;
  return (await import(moduleUrl)) as ApiErrorModule;
}

function response(status: number, body: string): Response {
  return new Response(body, {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

void test('getFoundationStatus returns the generated status payload on success', async () => {
  const { createApiClient } = await loadApiClient();
  const client = createApiClient({
    apiOrigin: 'https://api.example.test',
    fetchImpl: (input) => {
      const requestUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(requestUrl);
      assert.equal(url.origin, 'https://api.example.test');
      assert.equal(url.pathname, '/api/v1/status');
      assert.ok(
        url.searchParams.size === 0 ||
          (url.searchParams.size === 1 && url.searchParams.get('format') === 'summary'),
      );
      return Promise.resolve(response(200, JSON.stringify({ data: { status: 'operational' } })));
    },
  });

  assert.deepEqual(await client.getFoundationStatus(), { data: { status: 'operational' } });
});

for (const scenario of [
  {
    name: 'validation failures',
    fetchImpl: () =>
      Promise.resolve(
        response(
          400,
          JSON.stringify({
            error: {
              category: 'validation',
              code: 'VALIDATION_FAILED',
              message: 'Invalid request.',
            },
            requestId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        ),
      ),
    category: 'validation',
  },
  {
    name: 'offline service failures',
    fetchImpl: () => Promise.reject(new TypeError('offline-test-sentinel')),
    category: 'service',
  },
  {
    name: 'unparseable unexpected failures',
    fetchImpl: () => Promise.resolve(response(500, 'not-json')),
    category: 'unexpected',
  },
] as const) {
  void test(`getFoundationStatus categorizes ${scenario.name}`, async () => {
    const { ApiClientError, createApiClient } = await loadApiClient();
    const client = createApiClient({
      apiOrigin: 'https://api.example.test',
      fetchImpl: scenario.fetchImpl,
    });

    await assert.rejects(client.getFoundationStatus(), (error) => {
      if (!(error instanceof ApiClientError)) {
        return false;
      }

      assert.equal(error.category, scenario.category);
      assert.doesNotMatch(error.message, /offline-test-sentinel|not-json/);
      return true;
    });
  });
}

void test('classifyApiError preserves expected application categories from the OpenAPI error schema', async () => {
  const apiErrors = await loadApiErrors();
  const error = apiErrors.classifyApiError({
    error: {
      category: 'application',
      code: 'APPLICATION_ERROR',
      message: 'The requested operation could not be completed.',
    },
    requestId: '550e8400-e29b-41d4-a716-446655440000',
  });

  assert.equal(error.category, 'application');
  assert.doesNotMatch(error.message, /credential|connection string|stack/i);
});
