import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { DesignRequest, Job } from '@/api/types'
import { getMockScenario } from '@/lib/storage'
import { simulateJob } from '@/mocks/jobSim'
import { generateCandidates } from '@/mocks/generate'
import materialsFixture from '@/mocks/fixtures/materials.json'

/** Artificial latency in ms */
const LATENCY_MIN = 200
const LATENCY_MAX = 500

function delay(): Promise<void> {
  const ms = LATENCY_MIN + Math.random() * (LATENCY_MAX - LATENCY_MIN)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function makeResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : status === 202 ? 'Accepted' : 'Error',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  }
}

function makeErrorResponse(status: number, code: string, message: string): never {
  const error = new Error(message) as Error & {
    response: AxiosResponse
    isAxiosError: boolean
  }
  error.response = makeResponse({ error: { code, message } }, status)
  error.isAxiosError = true
  throw error
}

function generateJobId(): string {
  return 'j_' + Math.random().toString(36).slice(2, 8)
}

/** Custom axios adapter for mock mode */
export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const scenario = getMockScenario()

  // Simulate offline
  if (scenario === 'offline') {
    await delay()
    const error = new Error("Can't reach the Lattice Designer service.") as Error & {
      isAxiosError: boolean
      response: undefined
    }
    error.isAxiosError = true
    error.response = undefined
    throw error
  }

  await delay()

  const url = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()

  // GET /api/health
  if (method === 'get' && url.match(/\/api\/health$/)) {
    return makeResponse({ status: 'ok', model_loaded: true, gpu: true })
  }

  // GET /api/materials
  if (method === 'get' && url.match(/\/api\/materials$/)) {
    return makeResponse(materialsFixture)
  }

  // POST /api/designs
  if (method === 'post' && url.match(/\/api\/designs$/)) {
    if (scenario === 'bad_target') {
      makeErrorResponse(
        422,
        'bad_target',
        'Target stiffness is above the physical bound for this density.',
      )
    }

    const request = (
      typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    ) as DesignRequest
    const jobId = generateJobId()

    // Store the job creation time for simulation
    try {
      localStorage.setItem(`mock:job:${jobId}`, JSON.stringify({ createdAt: Date.now(), request }))
    } catch {
      // Ignore
    }

    return makeResponse({ job_id: jobId }, 202)
  }

  // GET /api/jobs/:id
  const jobMatch = url.match(/\/api\/jobs\/([^/]+)$/)
  if (method === 'get' && jobMatch) {
    const jobId = jobMatch[1]
    const stored = getStoredJob(jobId)

    if (!stored) {
      makeErrorResponse(404, 'not_found', 'Job not found')
    }

    const elapsed = (Date.now() - stored.createdAt) / 1000
    const state = simulateJob(elapsed)

    const job: Job = {
      job_id: jobId,
      status: state.status,
      stage: state.stage,
      progress: state.progress,
      message: state.message,
      candidates:
        state.status === 'done' ? generateCandidates(jobId, stored.request, scenario) : [],
    }

    return makeResponse(job)
  }

  // GET /api/jobs/:id/events — not handled by adapter (SSE uses the mock emitter)
  if (method === 'get' && url.match(/\/api\/jobs\/[^/]+\/events$/)) {
    return makeResponse({ message: 'Use SSE' })
  }

  // GET /api/designs/:id
  const designMatch = url.match(/\/api\/designs\/([^/]+)$/)
  if (method === 'get' && designMatch) {
    const designId = designMatch[1]
    // Search through all stored jobs
    const candidate = findCandidate(designId)
    if (!candidate) {
      makeErrorResponse(404, 'not_found', 'Design not found')
    }
    return makeResponse(candidate)
  }

  makeErrorResponse(404, 'not_found', 'Not found')
}

interface StoredJob {
  createdAt: number
  request: DesignRequest
}

function getStoredJob(jobId: string): StoredJob {
  try {
    const raw = localStorage.getItem(`mock:job:${jobId}`)
    if (raw) {
      return JSON.parse(raw) as StoredJob
    }
  } catch {
    // Ignore
  }

  // Fallback: create a default job
  const fallback: StoredJob = {
    createdAt: Date.now() - 15000,
    request: {
      material: 'ti64',
      part: { size_mm: [40, 40, 40], cell_mm: 10 },
      target: {
        stiffness_gpa: { x: 8, y: 8, z: 12 },
        strength_mpa: { x: 90, y: 90, z: null },
        max_mass_g: 60,
      },
      modes: { stiffness: 'about', strength: 'at_least', weight: 'at_most' },
      tolerance_pct: 10,
      n_results: 5,
    },
  }

  try {
    localStorage.setItem(`mock:job:${jobId}`, JSON.stringify(fallback))
  } catch {
    // Ignore
  }

  return fallback
}

function findCandidate(designId: string) {
  const scenario = getMockScenario()
  // Search all mock jobs
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('mock:job:')) continue
    const jobId = key.replace('mock:job:', '')
    const stored = getStoredJob(jobId)
    const candidates = generateCandidates(jobId, stored.request, scenario)
    const found = candidates.find((c) => c.id === designId)
    if (found) return found
  }
  return null
}
