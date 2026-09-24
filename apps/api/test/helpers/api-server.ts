import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';

export type ApiResponse = {
  body: string;
  headers: Readonly<Record<string, string | string[] | undefined>>;
  statusCode: number;
};

export type ApiServer = {
  get(path: string): Promise<ApiResponse>;
  readStdout(): string;
  request(input: { body?: string; method: string; path: string }): Promise<ApiResponse>;
  stop(): Promise<void>;
};

export type ApiServerOptions = {
  captureStdout?: boolean;
  databaseUrl?: string | undefined;
  nodeEnv?: 'development' | 'production' | 'test';
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

async function waitForListener(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const connected = await new Promise<boolean>((resolveConnection) => {
      const socket = createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolveConnection(true);
      });
      socket.once('error', () => resolveConnection(false));
    });

    if (connected) {
      return;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }

  throw new Error(`API did not listen on configured port ${port}`);
}

async function requestApi(
  port: number,
  input: { body?: string; method: string; path: string },
): Promise<ApiResponse> {
  return new Promise((resolveResponse, reject) => {
    const requestHandle = request(
      {
        host: '127.0.0.1',
        method: input.method,
        path: input.path,
        port,
        ...(input.body === undefined
          ? {}
          : {
              headers: {
                'content-length': Buffer.byteLength(input.body),
                'content-type': 'application/json',
              },
            }),
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          body += chunk;
        });
        response.once('end', () => {
          resolveResponse({
            body,
            headers: response.headers,
            statusCode: response.statusCode ?? 0,
          });
        });
      },
    );

    requestHandle.once('error', reject);
    requestHandle.end(input.body);
  });
}

async function get(port: number, path: string): Promise<ApiResponse> {
  return requestApi(port, { method: 'GET', path });
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  const exit = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolveExit) => {
      child.once('exit', (code, signal) => resolveExit({ code, signal }));
    },
  );
  child.kill('SIGTERM');
  let timeout: NodeJS.Timeout | undefined;

  try {
    const result = await Promise.race([
      exit,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('API child did not exit after SIGTERM')),
          5_000,
        );
      }),
    ]);
    assert.ok(
      result.code === 0 || result.signal === 'SIGTERM',
      `API child exited unexpectedly: code=${String(result.code)} signal=${String(result.signal)}`,
    );
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

export async function startApiServer(options: ApiServerOptions = {}): Promise<ApiServer> {
  const port = await getFreeLoopbackPort();
  let stdout = '';
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: resolve(import.meta.dirname, '../..'),
    env: {
      DATABASE_URL:
        options.databaseUrl ??
        'postgresql://synthetic_user:***@127.0.0.1:1/synthetic_db?connect_timeout=1',
      NODE_ENV: options.nodeEnv ?? 'test',
      PORT: String(port),
    },
    stdio: options.captureStdout === true ? ['ignore', 'pipe', 'pipe'] : 'ignore',
  });

  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    stdout += chunk;
  });

  try {
    await waitForListener(port, 5_000);
  } catch (error) {
    await stopChild(child);
    throw error;
  }

  return {
    get: async (path) => get(port, path),
    readStdout: () => stdout,
    request: async (input) => requestApi(port, input),
    stop: async () => stopChild(child),
  };
}
