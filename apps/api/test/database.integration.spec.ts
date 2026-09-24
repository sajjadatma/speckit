import assert from 'node:assert/strict';
import { Module, type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

type PrismaServiceContract = {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  onModuleDestroy(): Promise<void>;
};

type PrismaServiceConstructor = new () => PrismaServiceContract;

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const dbSkipReason =
  testDatabaseUrl === undefined
    ? 'TEST_DATABASE_URL is not supplied; DB-backed tests are skipped.'
    : false;

async function loadPrismaService(): Promise<PrismaServiceConstructor> {
  const serviceUrl = pathToFileURL(
    resolve(import.meta.dirname, '../dist/core/database/prisma.service.js'),
  ).href;
  const module = (await import(serviceUrl)) as { PrismaService: PrismaServiceConstructor };

  return module.PrismaService;
}

async function withTestDatabase<T>(operation: () => Promise<T>): Promise<T> {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = testDatabaseUrl!;

  try {
    return await operation();
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
}

function runDatabaseCheck(): Promise<number | null> {
  return new Promise((resolveExit, reject) => {
    const environment: NodeJS.ProcessEnv = {
      DATABASE_URL: testDatabaseUrl,
      HOME: process.env.HOME ?? '',
      PATH: process.env.PATH ?? '',
      ...(process.env.COREPACK_HOME === undefined
        ? {}
        : { COREPACK_HOME: process.env.COREPACK_HOME }),
    };
    const child = spawn('corepack', ['pnpm', 'run', 'db:check'], {
      cwd: resolve(import.meta.dirname, '..'),
      env: environment,
      stdio: 'ignore',
    });

    child.once('error', reject);
    child.once('exit', (code) => resolveExit(code));
  });
}

void test(
  'PrismaService executes a read-only SELECT 1 and disconnects',
  { skip: dbSkipReason },
  async () => {
    await withTestDatabase(async () => {
      const PrismaService = await loadPrismaService();
      const service = new PrismaService();

      try {
        assert.deepEqual(await service.$queryRaw`SELECT 1`, [{ '?column?': 1 }]);
      } finally {
        await service.onModuleDestroy();
      }
    });
  },
);

void test('Nest startup stays available with an unreachable PostgreSQL database', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL =
    'postgresql://synthetic_user:***@127.0.0.1:1/synthetic_db?connect_timeout=1';
  let application: INestApplicationContext | undefined;

  try {
    const PrismaService = await loadPrismaService();
    class DatabaseOfflineModule {}
    Module({ providers: [PrismaService] })(DatabaseOfflineModule);
    application = await NestFactory.createApplicationContext(DatabaseOfflineModule, {
      logger: false,
    });
  } finally {
    if (application) {
      await application.close();
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

void test('PrismaService detects a bounded synthetic connection failure without printing the URL', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL =
    'postgresql://synthetic_user:***@127.0.0.1:1/synthetic_db?connect_timeout=1';

  try {
    const PrismaService = await loadPrismaService();
    const service = new PrismaService();

    try {
      await assert.rejects(service.$queryRaw`SELECT 1`, (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.doesNotMatch(error.message, /synthetic_user|\*\*\*/);
        return true;
      });
    } finally {
      await service.onModuleDestroy();
    }
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

void test(
  'the disposable public schema has no application tables',
  { skip: dbSkipReason },
  async () => {
    await withTestDatabase(async () => {
      const PrismaService = await loadPrismaService();
      const service = new PrismaService();

      try {
        const rows = await service.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
        `;
        assert.deepEqual(
          rows.map(({ tablename }) => tablename).filter((name) => name !== '_prisma_migrations'),
          [],
        );
      } finally {
        await service.onModuleDestroy();
      }
    });
  },
);

void test(
  'db:check reports Prisma’s documented no-migration-table status without mutation',
  { skip: dbSkipReason },
  async () => {
    await withTestDatabase(async () => {
      const PrismaService = await loadPrismaService();
      const service = new PrismaService();

      try {
        const rows = await service.$queryRaw<Array<{ migration_table: string | null }>>`
          SELECT to_regclass('public."_prisma_migrations"')::text AS migration_table
        `;
        assert.deepEqual(rows, [{ migration_table: null }]);
      } finally {
        await service.onModuleDestroy();
      }
    });

    const exitCode = await runDatabaseCheck();

    assert.equal(
      exitCode,
      1,
      'an empty disposable schema without _prisma_migrations must retain Prisma migrate status exit code 1',
    );
  },
);
