import { FoundationStateSurface } from '../components/foundation-states.tsx';
import { describeFoundationState } from '../features/foundation/foundation-states.ts';

export default function Loading() {
  return <FoundationStateSurface descriptor={describeFoundationState('loading')} />;
}
