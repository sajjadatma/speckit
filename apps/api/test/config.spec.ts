import assert from 'node:assert/strict';
import test from 'node:test';

type ApiEnvironment = {
  corsOrigins: readonly string[];
  databaseUrl: string;
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
};

type ParseApiEnvironment = (input: Readonly<Record<string, string | undefined>>) => ApiEnvironment;

async function loadParseApiEnvironment(): Promise<ParseApiEnvironment> {
  const moduleUrl = new URL('../src/core/config/env.ts', import.meta.url).href;
  const module = (await import(moduleUrl)) as { parseApiEnvironment: ParseApiEnvironment };

  return module.parseApiEnvironment;
}

const validEnvironment = Object.freeze({
  DATABASE_URL: 'postgresql://fake_user:fake_password@localhost:5432/foundation_test?schema=public',
  NODE_ENV: 'development',
  PORT: '3001',
});

function assertRedactedError(
  error: unknown,
  variableName: string,
  suppliedValue?: string,
): boolean {
  assert.ok(error instanceof Error);
  assert.match(error.message, new RegExp(variableName));

  if (suppliedValue !== undefined) {
    assert.doesNotMatch(
      error.message,
      new RegExp(suppliedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  }

  return true;
}

void test('rejects a missing DATABASE_URL without exposing supplied configuration', async () => {
  const parseApiEnvironment = await loadParseApiEnvironment();

  assert.throws(
    () => parseApiEnvironment({ ...validEnvironment, DATABASE_URL: undefined }),
    (error) => assertRedactedError(error, 'DATABASE_URL'),
  );
});

void test('rejects malformed PostgreSQL DATABASE_URL without echoing its value', async () => {
  const parseApiEnvironment = await loadParseApiEnvironment();
  const malformedUrl = 'not-a-postgres-url-with-secret';

  assert.throws(
    () => parseApiEnvironment({ ...validEnvironment, DATABASE_URL: malformedUrl }),
    (error) => assertRedactedError(error, 'DATABASE_URL', malformedUrl),
  );
});

void test('accepts the approved example port and environment', async () => {
  const parseApiEnvironment = await loadParseApiEnvironment();

  assert.deepEqual(parseApiEnvironment(validEnvironment), {
    corsOrigins: [],
    databaseUrl: validEnvironment.DATABASE_URL,
    nodeEnv: 'development',
    port: 3001,
  });
});

void test('accepts an explicit comma-separated CORS_ORIGIN allowlist', async () => {
  const parseApiEnvironment = await loadParseApiEnvironment();

  assert.deepEqual(
    parseApiEnvironment({
      ...validEnvironment,
      CORS_ORIGIN: 'http://localhost:3000,https://app.example.test',
    }).corsOrigins,
    ['http://localhost:3000', 'https://app.example.test'],
  );
});

void test('rejects malformed CORS_ORIGIN without echoing its value', async () => {
  const parseApiEnvironment = await loadParseApiEnvironment();
  const malformedOrigin = 'https://user:secret@example.test/path';

  assert.throws(
    () => parseApiEnvironment({ ...validEnvironment, CORS_ORIGIN: malformedOrigin }),
    (error) => assertRedactedError(error, 'CORS_ORIGIN', malformedOrigin),
  );
});

void test('rejects non-integer and out-of-range PORT values without echoing values', async () => {
  const parseApiEnvironment = await loadParseApiEnvironment();

  for (const invalidPort of ['3001.5', '0', '65536']) {
    assert.throws(
      () => parseApiEnvironment({ ...validEnvironment, PORT: invalidPort }),
      (error) => assertRedactedError(error, 'PORT', invalidPort),
    );
  }
});

void test('rejects unsupported nonempty NODE_ENV without echoing its value', async () => {
  const parseApiEnvironment = await loadParseApiEnvironment();
  const unsupportedEnvironment = 'staging-secret-label';

  assert.throws(
    () => parseApiEnvironment({ ...validEnvironment, NODE_ENV: unsupportedEnvironment }),
    (error) => assertRedactedError(error, 'NODE_ENV', unsupportedEnvironment),
  );
});
