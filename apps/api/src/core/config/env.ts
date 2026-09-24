import { z } from 'zod';

export type ApiEnvironment = {
  corsOrigins: readonly string[];
  databaseUrl: string;
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
};

type ApiEnvironmentVariable = 'CORS_ORIGIN' | 'DATABASE_URL' | 'PORT' | 'NODE_ENV';

const apiEnvironmentSchema = z
  .object({
    CORS_ORIGIN: z.string().optional(),
    DATABASE_URL: z.string().min(1),
    PORT: z.string().regex(/^\d+$/),
    NODE_ENV: z.enum(['development', 'test', 'production']),
  })
  .passthrough();

function invalidEnvironment(variableName: ApiEnvironmentVariable): never {
  throw new Error(`Invalid environment variable: ${variableName}`);
}

function parseCorsOrigins(value: string | undefined): readonly string[] {
  if (value === undefined) {
    return [];
  }

  const origins = value.split(',');

  if (origins.length === 0 || new Set(origins).size !== origins.length) {
    return invalidEnvironment('CORS_ORIGIN');
  }

  for (const origin of origins) {
    try {
      const parsedOrigin = new URL(origin);

      if (
        (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') ||
        parsedOrigin.origin !== origin ||
        parsedOrigin.username !== '' ||
        parsedOrigin.password !== ''
      ) {
        return invalidEnvironment('CORS_ORIGIN');
      }
    } catch {
      return invalidEnvironment('CORS_ORIGIN');
    }
  }

  return origins;
}

export function parseApiEnvironment(
  input: Readonly<Record<string, string | undefined>>,
): ApiEnvironment {
  const result = apiEnvironmentSchema.safeParse(input);

  if (!result.success) {
    const variableName = result.error.issues[0]?.path[0];

    if (variableName === 'DATABASE_URL' || variableName === 'PORT' || variableName === 'NODE_ENV') {
      return invalidEnvironment(variableName);
    }

    return invalidEnvironment('DATABASE_URL');
  }

  let databaseUrl: URL;

  try {
    databaseUrl = new URL(result.data.DATABASE_URL);
  } catch {
    return invalidEnvironment('DATABASE_URL');
  }

  if (databaseUrl.protocol !== 'postgres:' && databaseUrl.protocol !== 'postgresql:') {
    return invalidEnvironment('DATABASE_URL');
  }

  const port = Number(result.data.PORT);

  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    return invalidEnvironment('PORT');
  }

  return {
    corsOrigins: parseCorsOrigins(result.data.CORS_ORIGIN),
    databaseUrl: result.data.DATABASE_URL,
    port,
    nodeEnv: result.data.NODE_ENV,
  };
}
