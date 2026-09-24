import type { ErrorFallback } from '../../lib/api/errors.ts';

export type ServiceErrorProps = {
  fallback: ErrorFallback;
  retryHref?: string;
};

/**
 * Server-renderable, presentation-only fallback for bounded API errors. Hosts
 * decide the recovery URL; this component never receives or renders raw errors.
 */
export function ServiceError({ fallback, retryHref }: ServiceErrorProps) {
  return (
    <section aria-labelledby="service-error-title" role="alert">
      <h2 id="service-error-title">{fallback.title}</h2>
      <p>{fallback.message}</p>
      {fallback.retryable && retryHref !== undefined ? (
        <a
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          href={retryHref}
        >
          Try again
        </a>
      ) : null}
    </section>
  );
}
