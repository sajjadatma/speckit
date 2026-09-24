import { FoundationStateSurface } from '../../components/foundation-states.tsx';
import {
  FOUNDATION_STATE_KINDS,
  describeFoundationState,
} from '../../features/foundation/foundation-states.ts';

export default function FoundationStatesPage() {
  return (
    <main aria-label="Foundation state reference">
      <h1>Foundation state reference</h1>
      {FOUNDATION_STATE_KINDS.map((kind) => {
        const descriptor = describeFoundationState(kind);

        return (
          <FoundationStateSurface
            descriptor={descriptor}
            key={kind}
            recoveryHref={descriptor.recoveryLabel === undefined ? undefined : '/states'}
          />
        );
      })}
    </main>
  );
}
