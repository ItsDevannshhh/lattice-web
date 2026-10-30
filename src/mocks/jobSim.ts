import type { JobStage, JobStatus } from '@/api/types'
import { getMockScenario } from '@/lib/storage'

interface SimState {
  status: JobStatus
  stage: JobStage
  progress: number
  message: string
}

/**
 * Compute job state purely from elapsed seconds since creation.
 * Deterministic and survives page refresh.
 */
export function simulateJob(elapsedSec: number): SimState {
  const scenario = getMockScenario()

  if (scenario === 'offline') {
    return { status: 'running', stage: 'search', progress: 0, message: 'Connecting...' }
  }

  if (scenario === 'fail') {
    // Fail at verify stage ~6s
    if (elapsedSec < 1) {
      return { status: 'queued', stage: 'search', progress: 0, message: 'Waiting in queue' }
    }
    if (elapsedSec < 3) {
      const p = ((elapsedSec - 1) / 2) * 0.4
      return {
        status: 'running',
        stage: 'search',
        progress: p,
        message: `Searching latent space: ${Math.floor(p * 400)} of 400 starting points`,
      }
    }
    if (elapsedSec < 5) {
      const p = 0.4 + ((elapsedSec - 3) / 2) * 0.18
      return {
        status: 'running',
        stage: 'repair',
        progress: p,
        message: `Repairing invalid lattices (${Math.floor(((elapsedSec - 3) / 2) * 48)} of 48)`,
      }
    }
    return {
      status: 'failed',
      stage: 'verify',
      progress: 0.58,
      message: 'Solver crashed on candidate 212',
    }
  }

  const totalTime = scenario === 'slow' ? 35 : 12

  if (elapsedSec < 1) {
    return { status: 'queued', stage: 'search', progress: 0, message: 'Waiting in queue' }
  }

  if (elapsedSec >= totalTime) {
    return { status: 'done', stage: 'rank', progress: 1, message: 'Completed' }
  }

  const frac = (elapsedSec - 1) / (totalTime - 1)

  // Search: 0..0.45
  if (frac < 0.45) {
    const stageFrac = frac / 0.45
    const count = Math.floor(stageFrac * 400)
    return {
      status: 'running',
      stage: 'search',
      progress: frac,
      message: `Searching latent space: ${count} of 400 starting points`,
    }
  }

  // Repair: 0.45..0.58
  if (frac < 0.58) {
    const stageFrac = (frac - 0.45) / 0.13
    const count = Math.floor(stageFrac * 48)
    return {
      status: 'running',
      stage: 'repair',
      progress: frac,
      message: `Repairing invalid lattices (${count} of 48)`,
    }
  }

  // Verify: 0.58..0.92
  if (frac < 0.92) {
    const stageFrac = (frac - 0.58) / 0.34
    const count = Math.floor(stageFrac * 400)
    return {
      status: 'running',
      stage: 'verify',
      progress: frac,
      message: `Verified ${count} of 400 candidates`,
    }
  }

  // Rank: 0.92..1.0
  const stageFrac = (frac - 0.92) / 0.08
  return {
    status: 'running',
    stage: 'rank',
    progress: frac,
    message: stageFrac < 0.5 ? 'Ranking by match error' : 'Finalising results',
  }
}
