import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { DesignRequest, Job } from '@/api/types'
import type { ConfirmImplantRequest, Zone } from '@/api/implantTypes'
import { getMockScenario } from '@/lib/storage'
import { simulateJob } from '@/mocks/jobSim'
import { generateCandidates } from '@/mocks/generate'
import { mockReach } from '@/mocks/reachSim'
import { mockLimits } from '@/mocks/limitsSim'
import {
  createMockImplant,
  confirmMockImplant,
  getMockZones,
  updateMockZones,
  searchMockImplantZones,
  getMockZoneCandidates,
  assembleMockImplant,
  getMockImplantResult,
  getMockExportStl,
  getMockReport,
} from '@/mocks/implantMock'
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
    const error = new Error('Can\u2019t reach the Lattice Designer service.') as Error & {
      isAxiosError: boolean
      response: undefined
    }
    error.isAxiosError = true
    error.response = undefined
    throw error
  }

  // queue_full scenario for POST /api/designs
  if (scenario === 'queue_full') {
    const url = config.url ?? ''
    const method = (config.method ?? 'get').toLowerCase()
    if (method === 'post' && /\/api\/designs$/.test(url)) {
      await delay()
      makeErrorResponse(429, 'queue_full', 'The queue is full. Try again in a minute.')
    }
  }

  await delay()

  const url = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()

  // GET /api/health
  if (method === 'get' && /\/api\/health$/.test(url)) {
    return makeResponse({ status: 'ok', model_loaded: true, gpu: true })
  }

  // GET /api/materials
  if (method === 'get' && /\/api\/materials$/.test(url)) {
    return makeResponse(materialsFixture)
  }

  // GET /api/limits
  if (method === 'get' && /\/api\/limits/.test(url)) {
    const params = config.params as Record<string, string> | undefined
    const materialId = params?.material ?? 'ti64'
    const material = (materialsFixture as Array<{ id: string; E_gpa: number; yield_mpa: number }>)
      .find((m) => m.id === materialId)
    return makeResponse(mockLimits(material?.E_gpa ?? 114, material?.yield_mpa ?? 880))
  }

  // POST /api/reach
  if (method === 'post' && /\/api\/reach$/.test(url)) {
    const request = parseBody<DesignRequest>(config)
    const material = (materialsFixture as Array<{ id: string; E_gpa: number; yield_mpa: number; density_g_cm3: number }>)
      .find((m) => m.id === request.material)
    const result = mockReach(request, material ?? { E_gpa: 114, yield_mpa: 880, density_g_cm3: 4.43 })
    if (result.error) {
      makeErrorResponse(result.error.status, result.error.code, result.error.message)
    }
    return makeResponse(result.response)
  }

  // POST /api/designs
  if (method === 'post' && /\/api\/designs$/.test(url)) {
    if (scenario === 'bad_target') {
      makeErrorResponse(
        422,
        'bad_target',
        'Target stiffness is above the physical bound for this density.',
      )
    }

    const request = parseBody<DesignRequest>(config)
    const jobId = generateJobId()

    try {
      localStorage.setItem(
        `mock:job:${jobId}`,
        JSON.stringify({ createdAt: Date.now(), request, scenario }),
      )
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
    const jobScenario = stored.scenario ?? scenario

    const elapsed = (Date.now() - stored.createdAt) / 1000
    const state = simulateJob(elapsed, jobScenario)

    const candidates =
      state.status === 'done'
        ? generateCandidates(jobId, stored.request, jobScenario)
        : []

    const job: Job = {
      job_id: jobId,
      status: state.status,
      stage: state.stage,
      round: state.round,
      k: state.k,
      progress: state.progress,
      message: state.message,
      rounds: state.rounds,
      infeasible: false,
      warnings: state.warnings,
      reach: state.reach,
      candidates,
      queue_position: state.queue_position,
      request: stored.request,
    }

    return makeResponse(job)
  }

  // GET /api/jobs/:id/events — not handled by adapter (SSE uses the mock emitter)
  if (method === 'get' && /\/api\/jobs\/[^/]+\/events$/.test(url)) {
    return makeResponse({ message: 'Use SSE' })
  }

  // GET /api/designs/:id
  const designMatch = url.match(/\/api\/designs\/([^/]+)$/)
  if (method === 'get' && designMatch) {
    const designId = designMatch[1]
    const candidate = findCandidate(designId)
    if (!candidate) {
      makeErrorResponse(404, 'not_found', 'Design not found')
    }
    return makeResponse(candidate)
  }

  // --- Implant API Endpoints (Provisional) ---

  // POST /api/implants
  if (method === 'post' && /\/api\/implants$/.test(url)) {
    const res = createMockImplant()
    return makeResponse(res, 201)
  }

  // POST /api/implants/:id/confirm
  const confirmMatch = url.match(/\/api\/implants\/([^/]+)\/confirm$/)
  if (method === 'post' && confirmMatch) {
    const implantId = confirmMatch[1]
    const body = parseBody<ConfirmImplantRequest>(config)
    confirmMockImplant(implantId, body)
    return makeResponse({ status: 'ok', implant_id: implantId })
  }

  // GET /api/implants/:id/zones
  const zonesMatch = url.match(/\/api\/implants\/([^/]+)\/zones$/)
  if (method === 'get' && zonesMatch) {
    const implantId = zonesMatch[1]
    const zones = getMockZones(implantId)
    return makeResponse(zones)
  }

  // PUT /api/implants/:id/zones
  if (method === 'put' && zonesMatch) {
    const implantId = zonesMatch[1]
    const body = parseBody<{ zones?: Zone[] } | Zone[]>(config)
    const zonesList = Array.isArray(body) ? body : body.zones ?? []
    const updated = updateMockZones(implantId, zonesList)
    return makeResponse(updated)
  }

  // POST /api/implants/:id/search
  const searchMatch = url.match(/\/api\/implants\/([^/]+)\/search$/)
  if (method === 'post' && searchMatch) {
    const implantId = searchMatch[1]
    const jobs = searchMockImplantZones(implantId)
    return makeResponse(jobs)
  }

  // GET /api/implants/:id/zones/:zone_id/candidates
  const candMatch = url.match(/\/api\/implants\/([^/]+)\/zones\/([^/]+)\/candidates$/)
  if (method === 'get' && candMatch) {
    const implantId = candMatch[1]
    const zoneId = candMatch[2]
    const res = getMockZoneCandidates(implantId, zoneId)
    return makeResponse(res)
  }

  // POST /api/implants/:id/assemble
  const assembleMatch = url.match(/\/api\/implants\/([^/]+)\/assemble$/)
  if (method === 'post' && assembleMatch) {
    const implantId = assembleMatch[1]
    const body = parseBody<{ choices?: Record<string, string> }>(config)
    const res = assembleMockImplant(implantId, body?.choices ?? {})
    return makeResponse(res, 202)
  }

  // GET /api/implants/:id/result
  const resultMatch = url.match(/\/api\/implants\/([^/]+)\/result$/)
  if (method === 'get' && resultMatch) {
    const implantId = resultMatch[1]
    const res = getMockImplantResult(implantId)
    return makeResponse(res)
  }

  // GET /api/implants/:id/export.stl
  const exportMatch = url.match(/\/api\/implants\/([^/]+)\/export\.stl$/)
  if (method === 'get' && exportMatch) {
    const blob = getMockExportStl()
    return makeResponse(blob)
  }

  // GET /api/implants/:id/report
  const reportMatch = url.match(/\/api\/implants\/([^/]+)\/report$/)
  if (method === 'get' && reportMatch) {
    const implantId = reportMatch[1]
    const blob = getMockReport(implantId)
    return makeResponse(blob)
  }

  makeErrorResponse(404, 'not_found', 'Not found')
}

function parseBody<T>(config: InternalAxiosRequestConfig): T {
  return (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) as T
}

interface StoredJob {
  createdAt: number
  request: DesignRequest
  scenario?: string
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

  // 1. Check all stored mock jobs
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('mock:job:')) continue
    const jobId = key.replace('mock:job:', '')
    const stored = getStoredJob(jobId)
    const candidates = generateCandidates(jobId, stored.request, stored.scenario ?? scenario)
    const found = candidates.find((c) => c.id === designId)
    if (found) return found
  }

  // 2. Check all stored implant workflows
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('mock:implant:')) continue
    const implantId = key.replace('mock:implant:', '')
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const state = JSON.parse(raw)
        const zones = state.zones || []
        for (const zone of zones) {
          if (zone.kind === 'lattice') {
            const res = getMockZoneCandidates(implantId, zone.id)
            const found = res.candidates.find((c) => c.id === designId)
            if (found) return found
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Fallback: generate deterministic candidate for the requested design ID so it never 404s
  const fallbackReq: DesignRequest = {
    material: 'ti64',
    part: { size_mm: [30, 30, 30], cell_mm: 5 },
    target: {
      stiffness_gpa: { x: 8, y: 8, z: 12 },
      strength_mpa: { x: 80, y: 80, z: 100 },
      rel_density: 0.15,
    },
    modes: { stiffness: 'about', strength: 'at_least', weight: 'at_most' },
    tolerance_pct: 10,
    n_results: 5,
  }
  const fallbackCandidates = generateCandidates(designId, fallbackReq, 'success')
  const matched = fallbackCandidates[0]
  if (matched) {
    return { ...matched, id: designId }
  }

  return null
}
