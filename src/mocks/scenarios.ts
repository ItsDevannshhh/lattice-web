export type MockScenario =
  'success' | 'slow' | 'partial' | 'empty' | 'fail' | 'bad_target' | 'offline'

export const SCENARIO_LABELS: Record<MockScenario, string> = {
  success: 'Success (5 candidates)',
  slow: 'Slow (~35s)',
  partial: 'Partial (no perfect match)',
  empty: 'Empty results',
  fail: 'Solver failure',
  bad_target: 'Bad target (422)',
  offline: 'Backend offline',
}

export const ALL_SCENARIOS: MockScenario[] = [
  'success',
  'slow',
  'partial',
  'empty',
  'fail',
  'bad_target',
  'offline',
]
