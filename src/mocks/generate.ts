import type { Candidate, DesignRequest, FailureMode, PerAxis, Properties } from '@/api/types'
import { GRID_27, EDGE_SETS } from '@/mocks/lattices'

/** Simple seeded PRNG (mulberry32) */
function createPrng(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i)
  }
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generate deterministic candidates from a design request */
export function generateCandidates(
  jobId: string,
  request: DesignRequest,
  scenario: string,
): Candidate[] {
  if (scenario === 'empty') return []

  const rand = createPrng(jobId)
  const n = request.n_results

  // Get target values
  const stiffTarget = request.target.stiffness_gpa
  const strengthTarget =
    'strength_mpa' in request.target
      ? request.target.strength_mpa
      : 'yield_strength_mpa' in request.target
        ? request.target.yield_strength_mpa
        : { x: null, y: null, z: null }

  const massLimit = 'max_mass_g' in request.target ? request.target.max_mass_g : null
  const rdLimit = 'rel_density' in request.target ? request.target.rel_density : null

  // Material density for mass/rd consistency
  const partVol =
    (request.part.size_mm[0] * request.part.size_mm[1] * request.part.size_mm[2]) / 1000

  const candidates: Candidate[] = []

  for (let i = 0; i < n; i++) {
    const matchErr = 1.5 + i * (7.5 / Math.max(n - 1, 1)) + (rand() - 0.5) * 0.5
    const errFactor = 1 + (scenario === 'partial' ? 0.15 : 0) * (i === 0 ? 1 : 0)

    // Build verified properties from targets with some variance
    const verified = buildProperties(stiffTarget, strengthTarget, matchErr * errFactor, rand)

    // Predicted = verified × (1 ± ~3%)
    const predicted = perturbProperties(verified, 0.03, rand)

    // Relative density & mass
    const rd = rdLimit
      ? rdLimit * (0.85 + rand() * 0.15)
      : massLimit
        ? (massLimit * (0.8 + rand() * 0.15)) / (partVol * 4.43)
        : 0.08 + rand() * 0.1

    const mass = massLimit ? massLimit * (0.8 + rand() * 0.15) : rd * partVol * 4.43

    // Pick an edge set
    const edgeIdx = i % EDGE_SETS.length

    // One candidate with thin struts (diameter < 0.4mm)
    const strutRadius = i === 3 ? 0.19 : 0.35 + rand() * 0.15

    candidates.push({
      id: `d_${jobId.replace('j_', '')}_${i + 1}`,
      rank: i + 1,
      match_error_pct: Math.round(matchErr * 10) / 10,
      rel_density: Math.round(rd * 1000) / 1000,
      mass_g: Math.round(mass * 10) / 10,
      lattice: {
        format: 'octant27',
        nodes: GRID_27,
        edges: EDGE_SETS[edgeIdx],
        cell_size_mm: request.part.cell_mm,
        strut_radius_mm: Math.round(strutRadius * 100) / 100,
      },
      predicted,
      verified,
    })
  }

  return candidates
}

function buildProperties(
  stiffTarget: PerAxis<number | null>,
  strengthTarget: PerAxis<number | null>,
  errorPct: number,
  rand: () => number,
): Properties {
  const errScale = errorPct / 100

  const stiff: PerAxis<number> = {
    x: applyError(stiffTarget.x ?? 5 + rand() * 5, errScale, rand),
    y: applyError(stiffTarget.y ?? 5 + rand() * 5, errScale, rand),
    z: applyError(stiffTarget.z ?? 8 + rand() * 5, errScale, rand),
  }

  const yieldS: PerAxis<number> = {
    x: applyError((strengthTarget.x ?? 80) * (1.1 + rand() * 0.3), errScale, rand),
    y: applyError((strengthTarget.y ?? 80) * (1.1 + rand() * 0.3), errScale, rand),
    z: applyError((strengthTarget.z ?? 120) * (1.1 + rand() * 0.3), errScale, rand),
  }

  const buckling: PerAxis<number> = {
    x: applyError((strengthTarget.x ?? 80) * (0.9 + rand() * 0.3), errScale, rand),
    y: applyError((strengthTarget.y ?? 80) * (0.9 + rand() * 0.3), errScale, rand),
    z: applyError((strengthTarget.z ?? 120) * (0.9 + rand() * 0.3), errScale, rand),
  }

  const strength: PerAxis<number> = {
    x: Math.min(yieldS.x, buckling.x),
    y: Math.min(yieldS.y, buckling.y),
    z: Math.min(yieldS.z, buckling.z),
  }

  const failure: PerAxis<FailureMode> = {
    x: yieldS.x <= buckling.x ? 'yield' : 'buckling',
    y: yieldS.y <= buckling.y ? 'yield' : 'buckling',
    z: yieldS.z <= buckling.z ? 'yield' : 'buckling',
  }

  return {
    stiffness_gpa: roundPerAxis(stiff),
    yield_strength_mpa: roundPerAxis(yieldS),
    buckling_strength_mpa: roundPerAxis(buckling),
    strength_mpa: roundPerAxis(strength),
    governing_failure: failure,
  }
}

function perturbProperties(base: Properties, maxPct: number, rand: () => number): Properties {
  return {
    stiffness_gpa: perturbAxis(base.stiffness_gpa, maxPct, rand),
    yield_strength_mpa: perturbAxis(base.yield_strength_mpa, maxPct, rand),
    buckling_strength_mpa: perturbAxis(base.buckling_strength_mpa, maxPct, rand),
    strength_mpa: {
      x: Math.min(
        perturbAxis(base.yield_strength_mpa, maxPct, rand).x,
        perturbAxis(base.buckling_strength_mpa, maxPct, rand).x,
      ),
      y: Math.min(
        perturbAxis(base.yield_strength_mpa, maxPct, rand).y,
        perturbAxis(base.buckling_strength_mpa, maxPct, rand).y,
      ),
      z: Math.min(
        perturbAxis(base.yield_strength_mpa, maxPct, rand).z,
        perturbAxis(base.buckling_strength_mpa, maxPct, rand).z,
      ),
    },
    governing_failure: base.governing_failure,
  }
}

function applyError(base: number, errScale: number, rand: () => number): number {
  return base * (1 + (rand() - 0.5) * 2 * errScale)
}

function perturbAxis(axis: PerAxis<number>, maxPct: number, rand: () => number): PerAxis<number> {
  return {
    x: Math.round(axis.x * (1 + (rand() - 0.5) * 2 * maxPct) * 10) / 10,
    y: Math.round(axis.y * (1 + (rand() - 0.5) * 2 * maxPct) * 10) / 10,
    z: Math.round(axis.z * (1 + (rand() - 0.5) * 2 * maxPct) * 10) / 10,
  }
}

function roundPerAxis(axis: PerAxis<number>): PerAxis<number> {
  return {
    x: Math.round(axis.x * 10) / 10,
    y: Math.round(axis.y * 10) / 10,
    z: Math.round(axis.z * 10) / 10,
  }
}
