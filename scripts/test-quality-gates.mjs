/* global URL, clearTimeout, console, fetch, process, setTimeout */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const apiRoot = join(repositoryRoot, 'apps/api');
const generatedClientDirectory = join(repositoryRoot, 'packages/api-client/src/generated');
const syntheticDatabaseUrl =
  'postgresql://synthetic_user:synthetic_password@127.0.0.1:1/synthetic_db?connect_timeout=1';
const probeResults = [];

function recordProbe(name, outcome) {
  probeResults.push({ name, outcome });
  console.log(`${outcome === 'PASS' ? 'PASS' : 'SKIP'} ${name}`);
}

const runTimeoutMs = 120_000;

function run(command, arguments_, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, arguments_, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let output = '';
    // Every external command is bounded: a probe must fail loudly, never hang a gate.
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      rejectRun(
        new Error(
          `Command did not exit within ${runTimeoutMs}ms: ${command} ${arguments_.join(' ')}`,
        ),
      );
    }, runTimeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolveRun({ code, output, signal });
    });
  });
}

async function getFreePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await new Promise((resolveListen) => server.once('listening', resolveListen));
  const address = server.address();
  assert.ok(address !== null && typeof address !== 'string');
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error === undefined ? resolveClose() : rejectClose(error))),
  );
  return address.port;
}

async function waitForListener(port) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const connected = await new Promise((resolveConnected) => {
      const socket = createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolveConnected(true);
      });
      socket.once('error', () => resolveConnected(false));
    });
    if (connected) {
      return;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`API did not listen on configured port ${port}.`);
}

async function stop(child) {
  if (child.exitCode !== null || child.killed) {
    return;
  }
  const exit = new Promise((resolveExit) => child.once('exit', resolveExit));
  child.kill('SIGTERM');
  await Promise.race([
    exit,
    new Promise((_, rejectTimeout) =>
      setTimeout(() => rejectTimeout(new Error('API did not stop after SIGTERM.')), 5_000),
    ),
  ]);
}

async function startApi() {
  const port = await getFreePort();
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: apiRoot,
    env: {
      DATABASE_URL: syntheticDatabaseUrl,
      NODE_ENV: 'test',
      PATH: process.env.PATH ?? '',
      PORT: String(port),
      TMPDIR: process.env.TMPDIR ?? tmpdir(),
    },
    stdio: 'ignore',
  });
  try {
    await waitForListener(port);
  } catch (error) {
    await stop(child);
    throw error;
  }
  return { child, origin: `http://127.0.0.1:${port}` };
}

async function probeConfigurationAbsent() {
  const port = await getFreePort();
  // Run from a directory without a .env file: a developer who follows the documented
  // "copy .env.example to .env" step legitimately has one, and this probe must test the
  // application's fail-fast validation rather than that developer convenience.
  const neutralDirectory = await mkdtemp(join(tmpdir(), 'platform-absent-env-'));
  try {
    const result = await run(process.execPath, [join(apiRoot, 'dist/main.js')], {
      cwd: neutralDirectory,
      env: {
        NODE_ENV: 'test',
        PATH: process.env.PATH ?? '',
        PORT: String(port),
        TMPDIR: process.env.TMPDIR ?? tmpdir(),
      },
    });
    assert.notEqual(result.code, 0, 'API startup unexpectedly accepted absent DATABASE_URL.');
    assert.match(result.output, /Invalid environment variable: DATABASE_URL/);
    assert.doesNotMatch(
      result.output,
      /synthetic_password|TEST_DATABASE_URL|DATABASE_URL=.*postgres/i,
    );
    recordProbe('configuration absent', 'PASS');
  } finally {
    await rm(neutralDirectory, { recursive: true, force: true });
  }
}

async function probeStatusValidation() {
  const api = await startApi();
  try {
    const [invalid, valid] = await Promise.all([
      fetch(`${api.origin}/api/v1/status?format=invalid_sentinel`),
      fetch(`${api.origin}/api/v1/status?format=summary`),
    ]);
    assert.equal(invalid.status, 400, 'Invalid status query must return HTTP 400.');
    assert.equal(valid.status, 200, 'Valid status query must return HTTP 200.');
    recordProbe('status validation (400 invalid, 200 valid)', 'PASS');
  } finally {
    await stop(api.child);
  }
}

async function probeContractDrift() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'platform-contract-drift-'));
  try {
    await cp(generatedClientDirectory, temporaryDirectory, { recursive: true });
    const candidate = join(temporaryDirectory, 'index.ts');
    await writeFile(candidate, `${await readFile(candidate, 'utf8')}\n// gate-drift-sentinel\n`);
    const result = await run(
      'corepack',
      ['pnpm', '--filter', '@platform/api', 'run', 'contract:check'],
      {
        env: {
          ...process.env,
          CONTRACT_GENERATED_DIR: temporaryDirectory,
          DATABASE_URL: syntheticDatabaseUrl,
        },
      },
    );
    assert.notEqual(
      result.code,
      0,
      'Mutated generated client unexpectedly passed contract drift check.',
    );
    assert.match(result.output, /OpenAPI generated client drift detected/);
    recordProbe('contract drift', 'PASS');
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

async function probeMigrationStatus() {
  const result = await run('corepack', ['pnpm', '--filter', '@platform/api', 'run', 'db:check'], {
    env: { ...process.env, DATABASE_URL: syntheticDatabaseUrl },
  });
  assert.equal(
    result.code,
    1,
    'Synthetic migration status must preserve its documented exit code 1.',
  );
  recordProbe('migration status (synthetic unreachable URL, exit 1)', 'PASS');
}

try {
  await probeConfigurationAbsent();
  await probeStatusValidation();
  await probeContractDrift();
  await probeMigrationStatus();
  console.log(`Quality gate probes passed: ${probeResults.length}/${probeResults.length}.`);
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  console.error(`Quality gate probes completed before failure: ${probeResults.length}.`);
  process.exitCode = 1;
}
