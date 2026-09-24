import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import test from 'node:test';

const webRoot = resolve(import.meta.dirname, '..');
let webServer: ChildProcess | undefined;

async function reserveLoopbackPort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address !== null && typeof address !== 'string');
  const { port } = address;
  await new Promise<void>((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );

  return port;
}

async function waitForStartup(url: string, child: ChildProcess): Promise<Response> {
  let startupError = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    startupError += chunk.toString();
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next dev server exited before serving HTTP; stderr: ${startupError}`);
    }

    try {
      return await fetch(url);
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
    }
  }

  throw new Error(`Next dev server did not serve HTTP within 30000ms; stderr: ${startupError}`);
}

void test.after(async () => {
  if (webServer !== undefined && webServer.exitCode === null) {
    webServer.kill('SIGTERM');
    await once(webServer, 'exit');
  }
});

void test('Next dev starts independently and serves a neutral baseline page', async () => {
  const port = await reserveLoopbackPort();
  webServer = spawn(
    process.execPath,
    [
      resolve(webRoot, 'node_modules/next/dist/bin/next'),
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: webRoot,
      env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: String(port) },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );

  const response = await waitForStartup(`http://127.0.0.1:${port}/`, webServer);
  assert.equal(response.status, 200);

  const document = await response.text();
  assert.match(document, /<main(?:\s|>)/i);
  assert.match(document, /<h1[^>]*>\s*Platform Foundation\s*<\/h1>/i);
  assert.doesNotMatch(document, /<(nav|form)(?:\s|>)/i);
  assert.doesNotMatch(document, /(?:revenue|customers|orders|dashboard|sign in|log in)/i);
});
