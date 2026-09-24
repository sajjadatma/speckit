import { classifyApiError, toErrorFallback } from '../../lib/api/errors.ts';

export const FOUNDATION_STATE_KINDS = [
  'loading',
  'ready',
  'empty',
  'validation',
  'application',
  'service',
  'unexpected',
  'not-found',
  'route-error',
  'global-error',
] as const;

export type FoundationStateKind = (typeof FOUNDATION_STATE_KINDS)[number];

export type FoundationStateDescriptor = {
  kind: FoundationStateKind;
  title: string;
  message: string;
  recoveryLabel: string | undefined;
};

const FOUNDATION_STATES: Record<FoundationStateKind, FoundationStateDescriptor> = {
  loading: {
    kind: 'loading',
    title: 'Loading',
    message: 'Loading platform status.',
    recoveryLabel: undefined,
  },
  ready: {
    kind: 'ready',
    title: 'Platform status',
    message: 'The platform is ready to use.',
    recoveryLabel: undefined,
  },
  empty: {
    kind: 'empty',
    title: 'No content',
    message: 'There is no content to show yet.',
    recoveryLabel: undefined,
  },
  validation: {
    kind: 'validation',
    title: 'Check the request',
    message: 'Please correct the submitted values and try again.',
    recoveryLabel: 'Try again',
  },
  application: {
    kind: 'application',
    title: 'Request could not be completed',
    message: 'Please review the request and try again.',
    recoveryLabel: 'Try again',
  },
  service: {
    kind: 'service',
    title: 'Service temporarily unavailable',
    message: 'Please check your connection and try again shortly.',
    recoveryLabel: 'Try again',
  },
  unexpected: {
    kind: 'unexpected',
    title: 'Something went wrong',
    message: 'We could not complete that request. Please try again.',
    recoveryLabel: 'Try again',
  },
  'not-found': {
    kind: 'not-found',
    title: 'Not found',
    message: 'The requested page could not be found.',
    recoveryLabel: 'Back to start',
  },
  'route-error': {
    kind: 'route-error',
    title: 'Page error',
    message: 'Something went wrong while rendering this page.',
    recoveryLabel: 'Try again',
  },
  'global-error': {
    kind: 'global-error',
    title: 'Application error',
    message: 'Something went wrong while loading the application.',
    recoveryLabel: 'Reload',
  },
};

export function describeFoundationState(kind: FoundationStateKind): FoundationStateDescriptor {
  return FOUNDATION_STATES[kind];
}

export function describeErrorState(error: unknown): FoundationStateDescriptor {
  const fallback = toErrorFallback(error);

  return {
    kind: classifyApiError(error).category,
    title: fallback.title,
    message: fallback.message,
    recoveryLabel: 'Try again',
  };
}
