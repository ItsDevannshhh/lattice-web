/**
 * PLACEHOLDER ranges – Aryan supplies the real trained ranges.
 * These only drive soft warnings and input bounds; they never hard-block the form.
 */

export const TRAINED_RANGES = {
  stiffness_gpa: { min: 0.1, max: 50 },
  strength_mpa: { min: 1, max: 500 },
  mass_g: { min: 1, max: 500 },
  rel_density: { min: 0.01, max: 0.5 },
} as const

export const FORM_BOUNDS = {
  tolerance_pct: { min: 1, max: 50 },
  n_results: { min: 1, max: 20 },
  part_size_mm: { min: 1, max: 500 },
  cell_mm: { min: 1, max: 200 },
} as const
