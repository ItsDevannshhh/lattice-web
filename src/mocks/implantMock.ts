/**
 * Mock Implant API simulation.
 * Handles implant upload, zoning, search, assembly, and result visualization.
 * Marked PROVISIONAL per team plan.
 */

import type {
  CreateImplantResponse,
  ConfirmImplantRequest,
  Zone,
  ZoneCandidates,
  ImplantResult,
} from '@/api/implantTypes'
import type { DesignRequest } from '@/api/types'
import { generateCandidates } from '@/mocks/generate'
import { getStemSlice, generateSampleStemStl } from '@/mocks/stemProfile'

const IMPLANT_PREFIX = 'mock:implant:'

interface MockImplantState {
  id: string
  confirmed: boolean
  confirmRequest?: ConfirmImplantRequest
  zones: Zone[]
  zoneJobs?: Record<string, string> // zone_id -> job_id
  choices?: Record<string, string> // zone_id -> candidate_id
  assembleJobId?: string
  result?: ImplantResult
}

export function createMockImplant(description?: string): CreateImplantResponse {
  const implantId = 'imp_' + Math.random().toString(36).slice(2, 8)

  const defaultFields = {
    implant_type: 'Femoral hip stem',
    body_weight_kg: 75,
    activity: 'Moderate daily living (walking, stairs)',
    special_rules: ['Keep neck region fully solid for fatigue resistance'],
  }

  // Initial proposed zones (4 zones along a 160 mm stem)
  const initialZones: Zone[] = [
    createZone('z_tip', 'Distal Tip', [0, 40], 'lattice'),
    createZone('z_mid', 'Mid Stem (Diaphysis)', [40, 95], 'lattice'),
    createZone('z_upper', 'Upper Stem (Metaphysis)', [95, 135], 'lattice'),
    createZone('z_neck', 'Proximal Neck', [135, 160], 'solid', 'Fatigue critical region; solid required'),
  ]

  const state: MockImplantState = {
    id: implantId,
    confirmed: false,
    zones: initialZones,
  }

  try {
    localStorage.setItem(`${IMPLANT_PREFIX}${implantId}`, JSON.stringify(state))
  } catch {
    // Ignore
  }

  return {
    implant_id: implantId,
    mesh_report: {
      watertight: true,
      bodies: 1,
      size_mm: [32, 28, 160],
      guessed_units: 'mm',
      warnings: description?.includes('not watertight')
        ? ['Mesh is non-manifold near proximal collar']
        : undefined,
    },
    fields: defaultFields,
  }
}

function createZone(
  id: string,
  name: string,
  range_mm: [number, number],
  kind: 'lattice' | 'solid',
  reason?: string,
): Zone {
  const mid = (range_mm[0] + range_mm[1]) / 2
  const slice = getStemSlice(mid)
  const thickness = range_mm[1] - range_mm[0]

  return {
    id,
    name,
    range_mm,
    thickness_mm: thickness,
    area_mm2: slice.areaMm2,
    stress_mpa: slice.stressMpa,
    kind,
    reason,
    requirement: {
      stiffness_gpa: {
        x: { value: slice.targetStiffnessGpa, source: 'automatic' },
        y: { value: slice.targetStiffnessGpa, source: 'automatic' },
        z: { value: Math.round(slice.targetStiffnessGpa * 1.2 * 10) / 10, source: 'automatic' },
      },
      strength_mpa: {
        x: { value: slice.targetStrengthMpa, source: 'automatic' },
        y: { value: slice.targetStrengthMpa, source: 'automatic' },
        z: { value: Math.round(slice.targetStrengthMpa * 1.3 * 10) / 10, source: 'automatic' },
      },
      density: { value: 0.15, source: 'automatic' },
    },
    reach: {
      level: 'covered',
      distance_pct: 4.5,
      snapped: {
        stiffness_gpa: {
          x: slice.targetStiffnessGpa,
          y: slice.targetStiffnessGpa,
          z: Math.round(slice.targetStiffnessGpa * 1.2 * 10) / 10,
        },
        strength_mpa: {
          x: slice.targetStrengthMpa,
          y: slice.targetStrengthMpa,
          z: Math.round(slice.targetStrengthMpa * 1.3 * 10) / 10,
        },
      },
    },
  }
}

export function confirmMockImplant(implantId: string, req: ConfirmImplantRequest): void {
  const state = getMockImplantState(implantId)
  if (!state) return
  state.confirmed = true
  state.confirmRequest = req
  saveMockImplantState(state)
}

export function getMockZones(implantId: string): Zone[] {
  const state = getMockImplantState(implantId)
  return state?.zones ?? []
}

export function updateMockZones(implantId: string, newZones: Zone[]): Zone[] {
  const state = getMockImplantState(implantId)
  if (!state) return newZones

  // Recompute geometrical properties from boundaries
  const recalculated = newZones.map((z) => {
    const thickness = Math.max(1, z.range_mm[1] - z.range_mm[0])
    const mid = (z.range_mm[0] + z.range_mm[1]) / 2
    const slice = getStemSlice(mid)
    return {
      ...z,
      thickness_mm: thickness,
      area_mm2: slice.areaMm2,
      stress_mpa: slice.stressMpa,
    }
  })

  state.zones = recalculated
  saveMockImplantState(state)
  return recalculated
}

export function searchMockImplantZones(implantId: string): Record<string, string> {
  const state = getMockImplantState(implantId)
  if (!state) return {}

  const zoneJobs: Record<string, string> = {}
  state.zones.forEach((zone) => {
    if (zone.kind === 'lattice') {
      const jobId = 'j_' + zone.id + '_' + Math.random().toString(36).slice(2, 6)
      zoneJobs[zone.id] = jobId

      // Create a mock job for this zone
      const zoneReq: DesignRequest = {
        material: 'ti64',
        part: { size_mm: [30, 30, zone.thickness_mm], cell_mm: 5 },
        target: {
          stiffness_gpa: {
            x: zone.requirement.stiffness_gpa.x.value,
            y: zone.requirement.stiffness_gpa.y.value,
            z: zone.requirement.stiffness_gpa.z.value,
          },
          strength_mpa: {
            x: zone.requirement.strength_mpa.x.value,
            y: zone.requirement.strength_mpa.y.value,
            z: zone.requirement.strength_mpa.z.value,
          },
          rel_density: zone.requirement.density?.value ?? 0.15,
        },
        modes: { stiffness: 'about', strength: 'at_least', weight: 'at_most' },
        tolerance_pct: 10,
        n_results: 3,
      }

      try {
        localStorage.setItem(
          `mock:job:${jobId}`,
          JSON.stringify({ createdAt: Date.now(), request: zoneReq, scenario: 'success' }),
        )
      } catch {
        // Ignore
      }
    }
  })

  state.zoneJobs = zoneJobs
  saveMockImplantState(state)
  return zoneJobs
}

export function getMockZoneCandidates(implantId: string, zoneId: string): ZoneCandidates {
  const state = getMockImplantState(implantId)
  const zone = state?.zones.find((z) => z.id === zoneId)
  const thickness = zone ? zone.thickness_mm : 40

  const mockReq: DesignRequest = {
    material: 'ti64',
    part: { size_mm: [25, 25, thickness], cell_mm: 5 },
    target: {
      stiffness_gpa: { x: 8, y: 8, z: 12 },
      strength_mpa: { x: 50, y: 50, z: 70 },
      rel_density: 0.15,
    },
    modes: { stiffness: 'about', strength: 'at_least', weight: 'at_most' },
    tolerance_pct: 10,
    n_results: 3,
  }

  const candidates = generateCandidates(`cand_${zoneId}`, mockReq, 'success')

  return {
    candidates,
    grid: {
      cells: [5, 5, Math.max(1, Math.round(thickness / 5))],
      cell_mm: 5,
    },
  }
}

export function assembleMockImplant(
  implantId: string,
  choices: Record<string, string>,
): { job_id: string } {
  const state = getMockImplantState(implantId)
  const assembleJobId = 'j_asm_' + Math.random().toString(36).slice(2, 7)

  if (state) {
    state.choices = choices
    state.assembleJobId = assembleJobId

    // Generate assembled result
    state.result = generateMockImplantResult(state.zones)
    saveMockImplantState(state)
  }

  return { job_id: assembleJobId }
}

export function getMockImplantResult(implantId: string): ImplantResult {
  const state = getMockImplantState(implantId)
  if (state?.result) return state.result
  return generateMockImplantResult(state?.zones ?? [])
}

function generateMockImplantResult(zones: Zone[]): ImplantResult {
  const profile: { position_mm: number; stiffness_gpa: number; target_gpa?: number }[] = []

  for (let pos = 0; pos <= 160; pos += 10) {
    const slice = getStemSlice(pos)
    profile.push({
      position_mm: pos,
      stiffness_gpa: Math.round((slice.targetStiffnessGpa * 0.98 + (Math.random() - 0.5) * 0.4) * 10) / 10,
      target_gpa: slice.targetStiffnessGpa,
    })
  }

  return {
    zones: zones.map((z) => ({
      zone_id: z.id,
      target: z.requirement.stiffness_gpa.z.value,
      achieved: (z.requirement.stiffness_gpa.z.value ?? 10) * 0.97,
      pass: true,
    })),
    profile,
    warnings: [
      'Finite part boundary softening: edge struts exhibit ~3% compliance compared to infinite lattice.',
    ],
  }
}

export function getMockExportStl(): Blob {
  const asciiStl = generateSampleStemStl()
  return new Blob([asciiStl], { type: 'model/stl' })
}

export function getMockReport(implantId: string): Blob {
  const text = `LATTICE DESIGNER — IMPLANT SUMMARY REPORT
Implant ID: ${implantId}
Date: ${new Date().toISOString()}
Material: Ti-6Al-4V (E=114 GPa, Yield=880 MPa)
Analysis: Solver-verified beam lattice network
Status: PASS (all zones within targeted tolerances)

Disclaimer: Design aid only. Biomechanical physical testing required.`
  return new Blob([text], { type: 'text/plain' })
}

function getMockImplantState(implantId: string): MockImplantState | null {
  try {
    const raw = localStorage.getItem(`${IMPLANT_PREFIX}${implantId}`)
    if (!raw) return null
    return JSON.parse(raw) as MockImplantState
  } catch {
    return null
  }
}

function saveMockImplantState(state: MockImplantState): void {
  try {
    localStorage.setItem(`${IMPLANT_PREFIX}${state.id}`, JSON.stringify(state))
  } catch {
    // Ignore
  }
}

