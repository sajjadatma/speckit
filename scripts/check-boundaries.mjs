import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import ts from 'typescript';

const SOURCE_EXTENSIONS = new Set(['.cts', '.mts', '.ts', '.tsx']);
const SOURCE_ROOTS = [
  'apps/api/src/core',
  'apps/api/src/modules',
  'apps/api/src/domain',
  'apps/web/src',
  'packages/api-client/src',
  'packages/shared/src',
  'packages/config/src',
];
const EXCLUDED_SCOPE_TERMS = [
  /\baccounts?\b/i,
  /\bauth\b/i,
  /\bauthentication\b/i,
  /\baudit\s+logging\b/i,
  /\bbilling\b/i,
  /\bbooking\b/i,
  /\bbusiness\s+dashboards?\b/i,
  /\bcrm\b/i,
  /\bdedicated\s+search\b/i,
  /\bdelivery\b/i,
  /\becommerce\b/i,
  /\berp\b/i,
  /\bfiles?\b/i,
  /\blogin\b/i,
  /\bnotifications?\b/i,
  /\borganizations?\b/i,
  /\bpayments?\b/i,
  /\bpermissions?\b/i,
  /\bqueues?\b/i,
  /\breal-time\s+features\b/i,
  /\bredis\b/i,
  /\bregistrations?\b/i,
  /\broles?\b/i,
  /\bsessions?\b/i,
  /\bsettings\s+ui\b/i,
  /\bteams?\b/i,
  /\btenancy\b/i,
  /\busers?\b/i,
  /\bwarehouse\b/i,
];

function parseRoot(argumentsList) {
  if (argumentsList.length === 0) {
    return resolve(dirname(fileURLToPath(import.meta.url)), '..');
  }

  if (argumentsList.length === 2 && argumentsList[0] === '--root') {
    return resolve(argumentsList[1]);
  }

  throw new Error('Usage: node scripts/check-boundaries.mjs [--root <repository-root>]');
}

async function collectSourceFiles(root, sourceRoot) {
  const directory = resolve(root, sourceRoot);
  if (!existsSync(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(root, relative(root, entryPath))));
    } else if (
      entry.isFile() &&
      SOURCE_EXTENSIONS.has(extname(entry.name)) &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

function relativePath(root, path) {
  return relative(root, path).split(sep).join('/');
}

function sourceCandidate(path) {
  const extension = extname(path);
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
    return `${path.slice(0, -extension.length)}.ts`;
  }
  return path;
}

function resolveImport(root, sourcePath, specifier) {
  if (specifier.startsWith('.')) {
    return sourceCandidate(resolve(dirname(sourcePath), specifier));
  }

  if (specifier.startsWith('apps/api/src/')) {
    return sourceCandidate(resolve(root, specifier));
  }

  if (specifier.startsWith('@platform/api/src/')) {
    return sourceCandidate(
      resolve(root, 'apps/api/src', specifier.slice('@platform/api/src/'.length)),
    );
  }

  return undefined;
}

function layerFor(root, path) {
  const normalized = relativePath(root, path);
  if (normalized.startsWith('apps/api/src/core/')) {
    return 'core';
  }
  if (normalized.startsWith('apps/api/src/modules/')) {
    return 'modules';
  }
  if (normalized.startsWith('apps/api/src/domain/')) {
    return 'domain';
  }
  return undefined;
}

function isWebSource(root, path) {
  return relativePath(root, path).startsWith('apps/web/src/');
}

function isApiSource(root, path) {
  return relativePath(root, path).startsWith('apps/api/src/');
}

function isApiClientSource(root, path) {
  return relativePath(root, path).startsWith('packages/api-client/src/');
}

function isSharedPackageSource(root, path) {
  const normalized = relativePath(root, path);
  return (
    normalized.startsWith('packages/api-client/src/') ||
    normalized.startsWith('packages/shared/src/') ||
    normalized.startsWith('packages/config/src/')
  );
}

function isGeneratedApiClientSource(root, path) {
  return relativePath(root, path).startsWith('packages/api-client/src/generated/');
}

function importedSpecifiers(contents, filePath) {
  const sourceFile = ts.createSourceFile(filePath, contents, ts.ScriptTarget.Latest, false);
  return ts
    .preProcessFile(sourceFile.text, true, true)
    .importedFiles.map(({ fileName }) => fileName);
}

function findViolations(root, filesByPath) {
  const violations = [];

  for (const [sourcePath, contents] of filesByPath) {
    const sourceLayer = layerFor(root, sourcePath);
    for (const specifier of importedSpecifiers(contents, sourcePath)) {
      const destinationPath = resolveImport(root, sourcePath, specifier);
      if (destinationPath === undefined) {
        continue;
      }

      const destinationLayer = layerFor(root, destinationPath);
      const source = relativePath(root, sourcePath);
      const destination = relativePath(root, destinationPath);
      if (
        (sourceLayer === 'core' &&
          (destinationLayer === 'modules' || destinationLayer === 'domain')) ||
        (sourceLayer === 'modules' && destinationLayer === 'domain') ||
        (isWebSource(root, sourcePath) && isApiSource(root, destinationPath)) ||
        (isApiClientSource(root, sourcePath) && isApiSource(root, destinationPath))
      ) {
        violations.push(`${source} must not import ${destination}`);
      }
    }

    if (isSharedPackageSource(root, sourcePath) && !isGeneratedApiClientSource(root, sourcePath)) {
      for (const term of EXCLUDED_SCOPE_TERMS) {
        if (term.test(contents)) {
          violations.push(`${relativePath(root, sourcePath)} contains excluded scope term ${term}`);
        }
      }
    }
  }

  return violations;
}

async function main() {
  const root = parseRoot(process.argv.slice(2));
  const files = (
    await Promise.all(SOURCE_ROOTS.map((sourceRoot) => collectSourceFiles(root, sourceRoot)))
  ).flat();
  const filesByPath = new Map(
    await Promise.all(files.map(async (path) => [path, await readFile(path, 'utf8')])),
  );
  const violations = findViolations(root, filesByPath);

  if (violations.length > 0) {
    process.stderr.write(
      `Boundary violations:\n${violations.map((violation) => `- ${violation}`).join('\n')}\n`,
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Boundary check failed.'}\n`);
  process.exitCode = 1;
});
