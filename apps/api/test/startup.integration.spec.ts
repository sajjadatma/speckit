import assert from 'node:assert/strict';
import test from 'node:test';

import type { ApiServer, ApiServerOptions } from './helpers/api-server.js';

type StartApiServer = (options?: ApiServerOptions) => Promise<ApiServer>;

const { startApiServer } = (await import(
  new URL('./helpers/api-server.ts', import.meta.url).href
)) as unknown as {
  startApiServer: StartApiServer;
};

void test('API starts on the validated configured port without a database connection', async () => {
  const api = await startApiServer();

  try {
    const response = await api.get('/');
    assert.equal(response.statusCode, 404);
  } finally {
    await api.stop();
  }
});
