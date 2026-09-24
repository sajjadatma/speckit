/* global URL, console, process */

import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const generatedDirectory = resolve(
  repositoryRoot,
  process.env.CONTRACT_GENERATED_DIR ?? 'packages/api-client/src/generated',
);
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'platform-contract-'));

function run(command, arguments_, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, arguments_, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: 'inherit',
      ...options,
    });

    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(`${command} exited with code ${code ?? 'null'}${signal ? ` (${signal})` : ''}`),
      );
    });
  });
}

async function filesIn(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesIn(path, root)));
    } else if (entry.isFile()) {
      files.push(relative(root, path));
    }
  }

  return files.sort();
}

async function assertNoDrift(expectedDirectory, actualDirectory) {
  const [expectedFiles, actualFiles] = await Promise.all([
    filesIn(expectedDirectory),
    filesIn(actualDirectory),
  ]);
  const expectedSet = new Set(expectedFiles);
  const actualSet = new Set(actualFiles);
  const missing = expectedFiles.filter((file) => !actualSet.has(file));
  const extra = actualFiles.filter((file) => !expectedSet.has(file));
  const changed = [];

  for (const file of expectedFiles.filter((candidate) => actualSet.has(candidate))) {
    const [expected, actual] = await Promise.all([
      readFile(join(expectedDirectory, file)),
      readFile(join(actualDirectory, file)),
    ]);
    if (!expected.equals(actual)) {
      changed.push(file);
    }
  }

  if (missing.length || extra.length || changed.length) {
    const details = [
      missing.length ? `missing: ${missing.join(', ')}` : '',
      extra.length ? `extra: ${extra.join(', ')}` : '',
      changed.length ? `changed: ${changed.join(', ')}` : '',
    ].filter(Boolean);
    throw new Error(`OpenAPI generated client drift detected (${details.join('; ')})`);
  }

  console.log(`OpenAPI generated client is current (${expectedFiles.length} files).`);
}

try {
  const source = resolve(repositoryRoot, 'apps/api/dist/openapi.json');
  const sourceStats = await stat(source);
  if (!sourceStats.isFile()) {
    throw new Error(`OpenAPI artifact is not a file: ${source}`);
  }

  await run('corepack', ['pnpm', '--filter', '@platform/api-client', 'run', 'generate'], {
    env: { ...process.env, OPENAPI_OUTPUT: temporaryDirectory },
  });
  const temporaryFiles = await filesIn(temporaryDirectory);
  await run('corepack', [
    'pnpm',
    'exec',
    'prettier',
    '--config',
    join(repositoryRoot, 'prettier.config.mjs'),
    '--write',
    ...temporaryFiles.map((file) => join(temporaryDirectory, file)),
  ]);
  await assertNoDrift(generatedDirectory, temporaryDirectory);
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
