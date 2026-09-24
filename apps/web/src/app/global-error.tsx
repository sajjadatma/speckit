'use client';

import { describeFoundationState } from '../features/foundation/foundation-states.ts';

export default function GlobalError() {
  const descriptor = describeFoundationState('global-error');

  return (
    <html lang="en">
      <body>
        <main className="global-error-shell">
          <section aria-labelledby="global-error-title" role="alert">
            <h1 id="global-error-title">{descriptor.title}</h1>
            <p>{descriptor.message}</p>
            <a className="recovery-link" href="/">
              {descriptor.recoveryLabel}
            </a>
          </section>
        </main>
      </body>
    </html>
  );
}
