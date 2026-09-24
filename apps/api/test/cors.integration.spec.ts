import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import test from 'node:test';

type ApiResponse = {
  headers: Readonly<Record<string, string | string[] | undefined>>;
  statusCode: number;
};

async function getFreeLoopbackPort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  assert.ok(address !== null && typeof address !== 'string');
  const { port } = address;
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error === undefined ? resolveClose() : reject(error)));
  });

  return port;
}

async function waitForListener(port: number): Promise<void> {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolveConnection, reject) => {
        const probe = request({ host: '127.0.0.1', path: '/', port }, (response) => {
          response.resume();
          resolveConnection();
        });
        probe.once('error', reject);
        probe.end();
      });
      return;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    }
  }

  throw new Error(`API did not listen on configured port ${port}.`);
}

async function requestApi(port: number, origin?: string): Promise<ApiResponse> {
  return new Promise((resolveResponse, reject) => {
    const requestHandle = request(
      {
        headers: origin === undefined ? undefined : { origin },
        host: '127.0.0.1',
        path: '/api/v1/status',
        port,
      },
      (response) => {
        response.resume();
        response.once('end', () => {
          resolveResponse({
            headers: response.headers,
            statusCode: response.statusCode ?? 0,
          });
        });
      },
    );
    requestHandle.once('error', reject);
    requestHandle.end();
  });
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  const exit = once(child, 'exit');
  child.kill('SIGTERM');
  await Promise.race([
    exit,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('API child did not exit after SIGTERM.')), 5_000);
    }),
  ]);
}

void test('CORS permits only configured origins and exposes X-Request-Id', async () => {
  const port = await getFreeLoopbackPort();
  const allowedOrigin = 'http://localhost:3000';
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: resolve(import.meta.dirname, '..'),
    env: {
      CORS_ORIGIN: allowedOrigin,
      DATABASE_URL: 'postgresql://synthetic_user:***@127.0.0.1:1/synthetic_db?connect_timeout=1',
      NODE_ENV: 'test',
      PORT: String(port),
    },
    stdio: 'ignore',
  });

  try {
    await waitForListener(port);
    const [allowed, disallowed, absent] = await Promise.all([
      requestApi(port, allowedOrigin),
      requestApi(port, 'https://disallowed.example.test'),
      requestApi(port),
    ]);

    assert.equal(allowed.statusCode, 200);
    assert.equal(allowed.headers['access-control-allow-origin'], allowedOrigin);
    assert.equal(allowed.headers['access-control-expose-headers'], 'X-Request-Id');
    assert.equal(allowed.headers['access-control-allow-credentials'], undefined);
    assert.equal(disallowed.statusCode, 200);
    assert.equal(disallowed.headers['access-control-allow-origin'], undefined);
    assert.equal(absent.statusCode, 200);
    assert.equal(absent.headers['access-control-allow-origin'], undefined);
  } finally {
    await stopChild(child);
  }
});
