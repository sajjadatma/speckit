import {
  getFoundationStatus as requestFoundationStatus,
  type GetFoundationStatusResponse,
} from '@platform/api-client';
import { ApiClientError, classifyApiError } from './errors.ts';

export { ApiClientError, classifyApiError };
export type { ApiClientErrorInput, ApiErrorCategory } from './errors.ts';

export type ApiClientConfig = {
  apiOrigin: string;
  fetchImpl?: typeof fetch;
};

export type ApiClient = {
  getFoundationStatus(): Promise<GetFoundationStatusResponse>;
};

/**
 * Environment-aware reusable access layer over the generated API client.
 *
 * The generated package owns the wire contract; this module only binds the
 * runtime origin/fetch and converts every failure into a bounded
 * `ApiClientError` so UI callers never handle raw errors.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const { apiOrigin } = config;
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;

  return {
    async getFoundationStatus() {
      try {
        const result = await requestFoundationStatus<true>({
          baseUrl: apiOrigin,
          fetch: fetchImpl,
          throwOnError: true,
        });

        return result.data;
      } catch (error) {
        throw classifyApiError(error);
      }
    },
  };
}
