import assert from 'node:assert/strict';
import test from 'node:test';

type FoundationStateKind =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'validation'
  | 'application'
  | 'service'
  | 'unexpected'
  | 'not-found'
  | 'route-error'
  | 'global-error';

type FoundationStateDescriptor = {
  kind: FoundationStateKind;
  title: string;
  message: string;
  recoveryLabel: string | undefined;
};

type FoundationStatesModule = {
  FOUNDATION_STATE_KINDS: readonly FoundationStateKind[];
  describeFoundationState(kind: FoundationStateKind): FoundationStateDescriptor;
  describeErrorState(error: unknown): FoundationStateDescriptor;
};

type ErrorModule = {
  ApiClientError: new (input: {
    category: 'application' | 'service' | 'unexpected' | 'validation';
  }) => Error;
  toErrorFallback(error: unknown): {
    title: string;
    message: string;
  };
};

const STATE_KINDS: readonly FoundationStateKind[] = [
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
];

const COPY_EXPECTATIONS: Readonly<Partial<Record<FoundationStateKind, readonly RegExp[]>>> = {
  loading: [/load/i],
  ready: [/(ready|status|platform)/i],
  empty: [/(empty|no content|nothing)/i],
  'not-found': [/not found/i],
  'route-error': [/(error|wrong)/i],
};

async function loadFoundationStates(): Promise<FoundationStatesModule> {
  try {
    const moduleUrl = new URL('../src/features/foundation/foundation-states.ts', import.meta.url)
      .href;
    return (await import(moduleUrl)) as FoundationStatesModule;
  } catch (error) {
    assert.fail(
      `Foundation state contract module must exist before these state tests can pass: ${String(error)}`,
    );
  }
}

async function loadErrors(): Promise<ErrorModule> {
  const moduleUrl = new URL('../src/lib/api/errors.ts', import.meta.url).href;
  return (await import(moduleUrl)) as ErrorModule;
}

function assertBoundedDescriptor(descriptor: FoundationStateDescriptor): void {
  assert.match(descriptor.title, /\S/);
  assert.match(descriptor.message, /\S/);
  assert.doesNotMatch(
    `${descriptor.title} ${descriptor.message}`,
    /stack|payload|raw value|raw-value|trace|exception|sentinel/i,
  );

  if (descriptor.recoveryLabel !== undefined) {
    assert.match(descriptor.recoveryLabel, /\S/);
  }
}

void test('lists every contracted foundation state kind exactly once', async () => {
  const foundationStates = await loadFoundationStates();
  assert.deepEqual(foundationStates.FOUNDATION_STATE_KINDS, STATE_KINDS);
});

for (const kind of STATE_KINDS) {
  void test(`describes the ${kind} foundation state with bounded, observable copy`, async () => {
    const foundationStates = await loadFoundationStates();
    const descriptor = foundationStates.describeFoundationState(kind);

    assert.equal(descriptor.kind, kind);
    assertBoundedDescriptor(descriptor);

    for (const expectation of COPY_EXPECTATIONS[kind] ?? []) {
      assert.match(`${descriptor.title} ${descriptor.message}`, expectation);
    }

    if (kind === 'loading' || kind === 'ready' || kind === 'empty') {
      assert.equal(descriptor.recoveryLabel, undefined);
    } else {
      assert.notEqual(descriptor.recoveryLabel, undefined);
    }
  });
}

for (const scenario of [
  { category: 'validation', kind: 'validation' },
  { category: 'application', kind: 'application' },
  { category: 'service', kind: 'service' },
  { category: 'unexpected', kind: 'unexpected' },
] as const) {
  void test(`reuses the safe ${scenario.category} fallback copy`, async () => {
    const [foundationStates, errors] = await Promise.all([loadFoundationStates(), loadErrors()]);
    const error = new errors.ApiClientError({ category: scenario.category });
    const expected = errors.toErrorFallback(error);
    const descriptor = foundationStates.describeErrorState(error);

    assert.equal(descriptor.kind, scenario.kind);
    assert.equal(descriptor.title, expected.title);
    assert.equal(descriptor.message, expected.message);
    assert.notEqual(descriptor.recoveryLabel, undefined);
    assertBoundedDescriptor(descriptor);
  });
}

void test('maps unrecognized errors to the same safe unexpected fallback', async () => {
  const [foundationStates, errors] = await Promise.all([loadFoundationStates(), loadErrors()]);
  const rawError = new Error('foundation-state-stack-payload-sentinel');
  const expected = errors.toErrorFallback(rawError);
  const descriptor = foundationStates.describeErrorState(rawError);

  assert.equal(descriptor.kind, 'unexpected');
  assert.equal(descriptor.title, expected.title);
  assert.equal(descriptor.message, expected.message);
  assert.notEqual(descriptor.recoveryLabel, undefined);
  assertBoundedDescriptor(descriptor);
});
