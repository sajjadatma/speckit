import Link from 'next/link';
import type { FoundationStateDescriptor } from '../features/foundation/foundation-states.ts';

export type FoundationStateSurfaceProps = {
  descriptor: FoundationStateDescriptor;
  recoveryHref?: string;
};

export function FoundationStateSurface({ descriptor, recoveryHref }: FoundationStateSurfaceProps) {
  return (
    <section
      aria-labelledby={`${descriptor.kind}-state-title`}
      className="foundation-state"
      data-foundation-state={descriptor.kind}
      id={`foundation-state-${descriptor.kind}`}
      role={descriptor.kind === 'loading' ? 'status' : undefined}
    >
      <h2 id={`${descriptor.kind}-state-title`}>{descriptor.title}</h2>
      <p>{descriptor.message}</p>
      {descriptor.recoveryLabel !== undefined && recoveryHref !== undefined ? (
        <Link className="recovery-link" href={recoveryHref}>
          {descriptor.recoveryLabel}
        </Link>
      ) : null}
    </section>
  );
}
