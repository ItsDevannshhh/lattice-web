/**
 * Mock /api/limits response generator.
 * Returns a plausible per-density range table for any material.
 */
import { TI64_LIMITS, scaleLimitsForMaterial } from '@/config/limits'

export function mockLimits(E_gpa: number, yield_mpa: number): unknown {
  const limits =
    E_gpa === 114 && yield_mpa === 880
      ? TI64_LIMITS
      : scaleLimitsForMaterial(E_gpa, yield_mpa)

  return {
    densities: limits.densities,
    bounds: {
      stiffness_sum_max_gpa: limits.stiffness_sum_max_gpa,
      strength_max_mpa: limits.strength_max_mpa,
    },
  }
}

