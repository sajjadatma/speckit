import assert from 'node:assert/strict';
import test from 'node:test';

type WebConfig = {
  apiOrigin: string;
};

type ParseWebConfig = (input: Readonly<Record<string, string | undefined>>) => WebConfig;

async function loadParseWebConfig(): Promise<ParseWebConfig> {
  const moduleUrl = new URL('../src/core/config.ts', import.meta.url).href;
  const module = (await import(moduleUrl)) as { parseWebConfig: ParseWebConfig };

  return module.parseWebConfig;
}

function assertRedactedError(error: unknown, suppliedValue?: string): boolean {
  assert.ok(error instanceof Error);
  assert.match(error.message, /NEXT_PUBLIC_API_ORIGIN/);

  if (suppliedValue !== undefined) {
    assert.doesNotMatch(
      error.message,
      new RegExp(suppliedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  }

  return true;
}

void test('accepts the safe public API origin example', async () => {
  const parseWebConfig = await loadParseWebConfig();

  assert.deepEqual(parseWebConfig({ NEXT_PUBLIC_API_ORIGIN: 'http://localhost:3001' }), {
    apiOrigin: 'http://localhost:3001',
  });
});

void test('rejects missing public API origin without exposing configuration', async () => {
  const parseWebConfig = await loadParseWebConfig();

  assert.throws(
    () => parseWebConfig({}),
    (error) => assertRedactedError(error),
  );
});

void test('rejects unsafe public API origin values without exposing configuration', async () => {
  const parseWebConfig = await loadParseWebConfig();

  for (const invalidOrigin of [
    'relative-origin-test-sentinel',
    'ftp://origin-test-sentinel.invalid',
    'http://user:password@origin-test-sentinel.invalid',
    'https://origin-test-sentinel.invalid/path',
    'https://origin-test-sentinel.invalid?query=1',
    'https://origin-test-sentinel.invalid#fragment',
  ]) {
    assert.throws(
      () => parseWebConfig({ NEXT_PUBLIC_API_ORIGIN: invalidOrigin }),
      (error) => assertRedactedError(error, invalidOrigin),
    );
  }
});
