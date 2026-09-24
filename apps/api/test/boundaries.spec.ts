import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../../..');
const checkerPath = join(repositoryRoot, 'scripts/check-boundaries.mjs');
const scratchRoot = process.env.TMPDIR ?? tmpdir();

async function writeFixture(root: string, relativePath: string, contents: string): Promise<void> {
  const destination = join(root, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, contents, 'utf8');
}

async function runChecker(root: string): Promise<{ code: number; output: string }> {
  try {
    const { stderr, stdout } = await execFileAsync(process.execPath, [checkerPath, '--root', root]);
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    const result = error as { code?: number; stderr?: string; stdout?: string };
    return {
      code: result.code ?? 1,
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    };
  }
}

async function withFixture(
  files: Readonly<Record<string, string>>,
  assertion: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(scratchRoot, 'foundation-boundaries-'));

  try {
    await Promise.all(
      Object.entries(files).map(([path, contents]) => writeFixture(root, path, contents)),
    );
    await assertion(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

void test('accepts the repository baseline and a permitted domain-to-core dependency', async () => {
  const baseline = await runChecker(repositoryRoot);
  assert.equal(baseline.code, 0, baseline.output);

  await withFixture(
    {
      'apps/api/src/domain/feature.ts':
        "import { shared } from '../core/shared.js';\nexport { shared };\n",
      'apps/api/src/core/shared.ts': 'export const shared = true;\n',
      'apps/web/src/app/page.tsx': 'export default function Page() { return null; }\n',
    },
    async (root) => {
      const result = await runChecker(root);
      assert.equal(result.code, 0, result.output);
    },
  );
});

for (const violation of [
  {
    name: 'core importing modules',
    source: 'apps/api/src/core/foundation.ts',
    destination: '../modules/status.js',
    expectedPath: 'apps/api/src/modules/status.ts',
  },
  {
    name: 'core importing domain',
    source: 'apps/api/src/core/foundation.ts',
    destination: '../domain/feature.js',
    expectedPath: 'apps/api/src/domain/feature.ts',
  },
  {
    name: 'modules importing domain',
    source: 'apps/api/src/modules/status.ts',
    destination: '../domain/feature.js',
    expectedPath: 'apps/api/src/domain/feature.ts',
  },
  {
    name: 'web importing API source',
    source: 'apps/web/src/core/api.ts',
    destination: '../../../api/src/main.js',
    expectedPath: 'apps/api/src/main.ts',
  },
  {
    name: 'API client importing backend source',
    source: 'packages/api-client/src/index.ts',
    destination: '../../../apps/api/src/main.js',
    expectedPath: 'apps/api/src/main.ts',
  },
] as const) {
  void test(`rejects ${violation.name}`, async () => {
    await withFixture(
      {
        [violation.source]: `import '${violation.destination}';\n`,
        [violation.expectedPath]: 'export {};\n',
      },
      async (root) => {
        const result = await runChecker(root);
        assert.notEqual(result.code, 0);
        assert.match(
          result.output,
          new RegExp(violation.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        );
        assert.match(
          result.output,
          new RegExp(violation.expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        );
      },
    );
  });
}

void test('allows generic transport vocabulary only in generated API-client output', async () => {
  await withFixture(
    {
      'packages/api-client/src/generated/client.gen.ts':
        'export type ClientOptions = { auth?: string; file?: string; user?: string };\n',
    },
    async (root) => {
      const result = await runChecker(root);
      assert.equal(result.code, 0, result.output);
    },
  );
});

void test('rejects excluded scope vocabulary in shared package source', async () => {
  await withFixture(
    {
      'packages/shared/src/user.ts': 'export const user = null;\n',
      'packages/config/src/account.ts': 'export interface Account { id: string; }\n',
      'packages/api-client/src/transport.ts': 'export const request = true;\n',
    },
    async (root) => {
      const result = await runChecker(root);
      assert.notEqual(result.code, 0);
      assert.match(result.output, /packages\/shared\/src\/user\.ts/);
      assert.match(result.output, /user/i);
      assert.match(result.output, /packages\/config\/src\/account\.ts/);
      assert.match(result.output, /account/i);
    },
  );
});
