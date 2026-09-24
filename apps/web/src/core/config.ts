export type WebConfig = {
  apiOrigin: string;
};

function invalidApiOrigin(): never {
  throw new Error('Invalid environment variable: NEXT_PUBLIC_API_ORIGIN');
}

export function parseWebConfig(input: Readonly<Record<string, string | undefined>>): WebConfig {
  const apiOrigin = input.NEXT_PUBLIC_API_ORIGIN;

  if (apiOrigin === undefined || apiOrigin.length === 0) {
    return invalidApiOrigin();
  }

  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(apiOrigin);
  } catch {
    return invalidApiOrigin();
  }

  if (
    (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') ||
    parsedOrigin.username.length > 0 ||
    parsedOrigin.password.length > 0 ||
    parsedOrigin.pathname !== '/' ||
    parsedOrigin.search.length > 0 ||
    parsedOrigin.hash.length > 0
  ) {
    return invalidApiOrigin();
  }

  return { apiOrigin: parsedOrigin.origin };
}
