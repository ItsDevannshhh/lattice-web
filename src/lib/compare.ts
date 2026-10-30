import type { TargetMode } from '@/api/types'

export type EvalStatus = 'pass' | 'fail' | 'ignored'

export interface EvalResult {
  status: EvalStatus
  errorPct: number
}

/**
 * Evaluate whether a verified value meets a target under the given mode.
 * - about: |value - target| / target × 100 ≤ tolerancePct
 * - at_least: value ≥ target
 * - at_most: value ≤ target
 * - null target: ignored
 */
export function evaluateAxis(params: {
  target: number | null
  value: number
  mode: TargetMode
  tolerancePct: number
}): EvalResult {
  const { target, value, mode, tolerancePct } = params

  if (target === null || target === undefined) {
    return { status: 'ignored', errorPct: 0 }
  }

  const errorPct =
    target === 0 ? (value === 0 ? 0 : 100) : (Math.abs(value - target) / target) * 100

  switch (mode) {
    case 'about':
      return { status: errorPct <= tolerancePct ? 'pass' : 'fail', errorPct }
    case 'at_least':
      return { status: value >= target ? 'pass' : 'fail', errorPct }
    case 'at_most':
      return { status: value <= target ? 'pass' : 'fail', errorPct }
    default:
      return { status: 'ignored', errorPct }
  }
}

/** Check if ALL targeted axes pass */
export function allTargetsMet(results: EvalResult[]): boolean {
  return results.every((r) => r.status === 'pass' || r.status === 'ignored')
}
