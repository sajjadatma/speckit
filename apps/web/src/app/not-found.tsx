import { FoundationStateSurface } from '../components/foundation-states.tsx';
import { describeFoundationState } from '../features/foundation/foundation-states.ts';

export default function NotFound() {
  return (
    <FoundationStateSurface descriptor={describeFoundationState('not-found')} recoveryHref="/" />
  );
}
