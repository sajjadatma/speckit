import assert from 'node:assert/strict';
import test from 'node:test';

type ServiceErrorModule = {
  ApiClientError: new (input: {
    category: 'application' | 'service' | 'unexpected' | 'validation';
  }) => Error;
  toErrorFallback(error: Error): {
    title: string;
    message: string;
    retryable: boolean;
  };
};

async function loadServiceErrors(): Promise<ServiceErrorModule> {
  const moduleUrl = new URL('../src/lib/api/errors.ts', import.meta.url).href;
  return (await import(moduleUrl)) as ServiceErrorModule;
}

for (const scenario of [
  {
    category: 'application',
    retryable: false,
    expectedTitle: 'Request could not be completed',
  },
  {
    category: 'validation',
    retryable: false,
    expectedTitle: 'Check the request',
  },
  {
    category: 'service',
    retryable: true,
    expectedTitle: 'Service temporarily unavailable',
  },
  {
    category: 'unexpected',
    retryable: true,
    expectedTitle: 'Something went wrong',
  },
] as const) {
  void test(`toErrorFallback safely maps ${scenario.category} errors`, async () => {
    const serviceErrors = await loadServiceErrors();
    const fallback = serviceErrors.toErrorFallback(
      new serviceErrors.ApiClientError({ category: scenario.category }),
    );

    assert.equal(fallback.title, scenario.expectedTitle);
    assert.equal(fallback.retryable, scenario.retryable);
    assert.doesNotMatch(fallback.message, /stack|raw|payload|backend/i);

    if (scenario.category === 'application' || scenario.category === 'validation') {
      assert.doesNotMatch(
        `${fallback.title} ${fallback.message}`,
        /unavailable|connection|service/i,
      );
    }
  });
}

void test('toErrorFallback converts unknown errors to the bounded unexpected fallback', async () => {
  const serviceErrors = await loadServiceErrors();
  const fallback = serviceErrors.toErrorFallback(
    new Error('database password: secret stack trace'),
  );

  assert.deepEqual(fallback, {
    title: 'Something went wrong',
    message: 'We could not complete that request. Please try again.',
    retryable: true,
  });
});
