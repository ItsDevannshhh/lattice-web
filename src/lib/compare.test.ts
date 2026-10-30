import { describe, it, expect } from 'vitest'
import { evaluateAxis, allTargetsMet } from '@/lib/compare'

describe('evaluateAxis', () => {
  it('returns "ignored" when target is null', () => {
    const result = evaluateAxis({ target: null, value: 10, mode: 'about', tolerancePct: 10 })
    expect(result.status).toBe('ignored')
    expect(result.errorPct).toBe(0)
  })

  it('passes "about" mode when within tolerance', () => {
    const result = evaluateAxis({ target: 10, value: 10.5, mode: 'about', tolerancePct: 10 })
    expect(result.status).toBe('pass')
    expect(result.errorPct).toBeCloseTo(5, 0)
  })

  it('fails "about" mode when outside tolerance', () => {
    const result = evaluateAxis({ target: 10, value: 12, mode: 'about', tolerancePct: 10 })
    expect(result.status).toBe('fail')
    expect(result.errorPct).toBeCloseTo(20, 0)
  })

  it('passes "at_least" mode when value meets target', () => {
    const result = evaluateAxis({ target: 100, value: 105, mode: 'at_least', tolerancePct: 10 })
    expect(result.status).toBe('pass')
  })

  it('fails "at_least" mode when value is too low', () => {
    const result = evaluateAxis({ target: 100, value: 80, mode: 'at_least', tolerancePct: 10 })
    expect(result.status).toBe('fail')
  })

  it('passes "at_most" mode when value is below target', () => {
    const result = evaluateAxis({ target: 50, value: 40, mode: 'at_most', tolerancePct: 10 })
    expect(result.status).toBe('pass')
  })

  it('fails "at_most" mode when value exceeds target', () => {
    const result = evaluateAxis({ target: 50, value: 60, mode: 'at_most', tolerancePct: 10 })
    expect(result.status).toBe('fail')
  })
})

describe('allTargetsMet', () => {
  it('returns true when all results pass or are ignored', () => {
    const results = [
      { status: 'pass' as const, errorPct: 5 },
      { status: 'ignored' as const, errorPct: 0 },
      { status: 'pass' as const, errorPct: 2 },
    ]
    expect(allTargetsMet(results)).toBe(true)
  })

  it('returns false when any result fails', () => {
    const results = [
      { status: 'pass' as const, errorPct: 5 },
      { status: 'fail' as const, errorPct: 25 },
      { status: 'pass' as const, errorPct: 2 },
    ]
    expect(allTargetsMet(results)).toBe(false)
  })

  it('returns true for empty results', () => {
    expect(allTargetsMet([])).toBe(true)
  })
})
