'use client';

import { FoundationStateSurface } from '../components/foundation-states.tsx';
import { describeFoundationState } from '../features/foundation/foundation-states.ts';

export default function Error() {
  return (
    <FoundationStateSurface descriptor={describeFoundationState('route-error')} recoveryHref="/" />
  );
}
