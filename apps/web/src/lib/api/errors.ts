/**
 * Bounded, safe error taxonomy for the reusable frontend access layer.
 *
 * Categories mirror the generated API error schema (`error.category`) so the UI
 * can map any failure to a predictable fallback state. Raw backend values
 * (server messages, stacks, response bodies) are never surfaced in messages.
 */
export type ApiErrorCategory = 'application' | 'service' | 'unexpected' | 'validation';

export type ApiClientErrorInput = {
  category: ApiErrorCategory;
  code?: string;
  requestId?: string;
};

/**
 * Presentation-safe error state. It intentionally excludes backend codes,
 * request IDs, response bodies, messages, and stacks.
 */
export type ErrorFallback = {
  title: string;
  message: string;
  retryable: boolean;
};

const CATEGORY_MESSAGES: Record<ApiErrorCategory, string> = {
  application: 'The requested operation could not be completed.',
  service: 'The service is unavailable right now. Check your connection and try again.',
  unexpected: 'An unexpected error occurred. Please try again later.',
  validation: 'The request was rejected. Check the submitted values and try again.',
};

const API_ERROR_CATEGORIES: ReadonlySet<string> = new Set(Object.keys(CATEGORY_MESSAGES));

/**
 * Failure names that indicate the request never produced a usable response
 * (offline browser, DNS/TLS failure, aborted request) rather than a parsed
 * server answer.
 */
const NETWORK_FAILURE_NAMES: ReadonlySet<string> = new Set([
  'AbortError',
  'NetworkError',
  'TypeError',
]);

export class ApiClientError extends Error {
  readonly category: ApiErrorCategory;
  readonly code: string | undefined;
  readonly requestId: string | undefined;

  constructor(input: ApiClientErrorInput) {
    super(CATEGORY_MESSAGES[input.category]);
    this.name = 'ApiClientError';
    this.category = input.category;
    this.code = input.code;
    this.requestId = input.requestId;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiErrorCategory(value: unknown): value is ApiErrorCategory {
  return typeof value === 'string' && API_ERROR_CATEGORIES.has(value);
}

/**
 * Reads the documented API error envelope from a thrown value. The generated
 * client throws the parsed response body directly (`{ error, requestId }`) when
 * `throwOnError` is set, but a wrapper (`{ error: body, request, response }`)
 * from the non-throwing style is accepted as well.
 */
function readErrorEnvelope(error: unknown): ApiClientError | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const body = isRecord(error['error']) ? error['error'] : error;
  const category = body['category'];

  if (!isApiErrorCategory(category)) {
    return undefined;
  }

  const code = body['code'];
  const requestId = error['requestId'];

  return new ApiClientError({
    category,
    ...(typeof code === 'string' ? { code } : {}),
    ...(typeof requestId === 'string' ? { requestId } : {}),
  });
}

function isNetworkFailure(error: unknown): boolean {
  return (
    isRecord(error) && typeof error['name'] === 'string' && NETWORK_FAILURE_NAMES.has(error['name'])
  );
}

/**
 * Classifies any thrown value into the bounded `ApiClientError` taxonomy:
 * documented API envelope → its own category, network-level failure → `service`,
 * everything else (unparseable or unexpected payloads) → `unexpected`.
 */
export function classifyApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  const envelope = readErrorEnvelope(error);

  if (envelope !== undefined) {
    return envelope;
  }

  if (isNetworkFailure(error)) {
    return new ApiClientError({ category: 'service' });
  }

  return new ApiClientError({ category: 'unexpected' });
}

const ERROR_FALLBACKS: Record<ApiErrorCategory, ErrorFallback> = {
  application: {
    title: 'Request could not be completed',
    message: 'Please review the request and try again.',
    retryable: false,
  },
  service: {
    title: 'Service temporarily unavailable',
    message: 'Please check your connection and try again shortly.',
    retryable: true,
  },
  unexpected: {
    title: 'Something went wrong',
    message: 'We could not complete that request. Please try again.',
    retryable: true,
  },
  validation: {
    title: 'Check the request',
    message: 'Please correct the submitted values and try again.',
    retryable: false,
  },
};

/**
 * Converts a raw failure or classified API error into UI-safe, bounded copy.
 * Application and validation failures retain their distinct recovery paths;
 * neither is represented as a service outage.
 */
export function toErrorFallback(error: unknown): ErrorFallback {
  return ERROR_FALLBACKS[classifyApiError(error).category];
}
