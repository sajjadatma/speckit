'use client';

import { useEffect, useState } from 'react';
import { createApiClient } from '../../lib/api/client.ts';
import { toErrorFallback, type ErrorFallback } from '../../lib/api/errors.ts';
import { parseWebConfig } from '../../core/config.ts';
import { ServiceError } from './service-error.tsx';

type StatusState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; fallback: ErrorFallback };

function readApiOrigin(): string {
  try {
    return parseWebConfig({ NEXT_PUBLIC_API_ORIGIN: process.env.NEXT_PUBLIC_API_ORIGIN }).apiOrigin;
  } catch {
    throw new Error('Status service is unavailable.');
  }
}

export function StatusPanel() {
  const [state, setState] = useState<StatusState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;

    async function loadStatus(): Promise<void> {
      try {
        const client = createApiClient({ apiOrigin: readApiOrigin() });
        await client.getFoundationStatus();
        if (active) {
          setState({ kind: 'ready' });
        }
      } catch (error) {
        if (active) {
          setState({ kind: 'error', fallback: toErrorFallback(error) });
        }
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <section
        aria-live="polite"
        aria-labelledby="status-loading-title"
        className="foundation-state"
        role="status"
      >
        <h2 id="status-loading-title">Loading status</h2>
        <p>Loading platform status.</p>
      </section>
    );
  }

  if (state.kind === 'error') {
    return <ServiceError fallback={state.fallback} retryHref="/" />;
  }

  return (
    <section aria-labelledby="status-ready-title" className="foundation-state">
      <h2 id="status-ready-title">Platform status</h2>
      <p>The platform is ready.</p>
    </section>
  );
}
