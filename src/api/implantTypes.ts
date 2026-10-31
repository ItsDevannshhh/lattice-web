/**
 * Implant workflow types — PROVISIONAL.
 * All shapes are assumptions; mark // PROVISIONAL in consuming code
 * and list every assumption in the final report as a question for the backend teammate.
 */

import type { Candidate, PerAxis, ReachLevel } from '@/api/types'
import type { SourceKind } from '@/components/ui/source-tag'

export type ZoneKind = 'lattice' | 'solid' | 'undecided'

export interface MeshReport {
  watertight: boolean
  bodies: number
  size_mm: [number, number, number]
  guessed_units: string
  warnings?: string[]
}

export interface ImplantFields {
  implant_type: string
  body_weight_kg: number | null
  activity: string | null
  special_rules: string[]
}

export interface CreateImplantResponse {
  implant_id: string
  mesh_report: MeshReport
  fields: ImplantFields
}

export interface ConfirmImplantRequest {
  units: 'mm' | 'm' | 'inch'
  axis: 'x' | 'y' | 'z'
  flip: boolean
  fields: ImplantFields
}

export interface SourcedValue {
  value: number | null
  source: SourceKind
}

export interface Zone {
  id: string
  name?: string
  range_mm: [number, number]
  thickness_mm: number
  area_mm2: number
  stress_mpa: number
  requirement: {
    stiffness_gpa: PerAxis<SourcedValue>
    strength_mpa: PerAxis<SourcedValue>
    density?: SourcedValue
    max_mass_g?: SourcedValue
  }
  reach?: {
    level: ReachLevel
    distance_pct: number
    snapped?: {
      stiffness_gpa: PerAxis<number>
      strength_mpa: PerAxis<number>
    }
  }
  kind: ZoneKind
  reason?: string
}

export interface ZoneCandidates {
  candidates: Candidate[]
  grid?: { cells: [number, number, number]; cell_mm: number }
}

export interface ImplantResult {
  zones?: {
    zone_id: string
    target?: unknown
    achieved?: unknown
    pass?: boolean
  }[]
  profile?: {
    position_mm: number
    stiffness_gpa: number
    target_gpa?: number | null
  }[]
  warnings?: string[]
  strut_network?: unknown
}

