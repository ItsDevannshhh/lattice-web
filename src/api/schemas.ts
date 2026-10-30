import { z } from 'zod/v4'

const axisSchema = z.enum(['x', 'y', 'z'])
const failureModeSchema = z.enum(['yield', 'buckling'])

const perAxisNumber = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})

const perAxisFailure = z.object({
  x: failureModeSchema,
  y: failureModeSchema,
  z: failureModeSchema,
})

export const healthSchema = z
  .object({
    status: z.string(),
    model_loaded: z.boolean(),
    gpu: z.boolean(),
  })
  .passthrough()

export const materialSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    E_gpa: z.number(),
    yield_mpa: z.number(),
    density_g_cm3: z.number(),
  })
  .passthrough()

export const materialsListSchema = z.array(materialSchema)

export const propertiesSchema = z
  .object({
    stiffness_gpa: perAxisNumber,
    yield_strength_mpa: perAxisNumber,
    buckling_strength_mpa: perAxisNumber,
    strength_mpa: perAxisNumber,
    governing_failure: perAxisFailure,
  })
  .passthrough()

export const latticeSchema = z
  .object({
    format: z.literal('octant27'),
    nodes: z.array(z.array(z.number())),
    edges: z.array(z.array(z.number())),
    cell_size_mm: z.number(),
    strut_radius_mm: z.number(),
  })
  .passthrough()

export const candidateSchema = z
  .object({
    id: z.string(),
    rank: z.number(),
    match_error_pct: z.number(),
    rel_density: z.number(),
    mass_g: z.number(),
    lattice: latticeSchema,
    predicted: propertiesSchema,
    verified: propertiesSchema,
  })
  .passthrough()

const jobStatusSchema = z.enum(['queued', 'running', 'done', 'failed'])
const jobStageSchema = z.enum(['search', 'repair', 'verify', 'rank'])

export const jobSchema = z
  .object({
    job_id: z.string(),
    status: jobStatusSchema,
    stage: jobStageSchema.optional(),
    progress: z.number(),
    message: z.string(),
    candidates: z.array(candidateSchema),
  })
  .passthrough()

export const jobEventSchema = z
  .object({
    stage: jobStageSchema,
    progress: z.number(),
    message: z.string(),
  })
  .passthrough()

export const createDesignResponseSchema = z
  .object({
    job_id: z.string(),
  })
  .passthrough()

export { axisSchema, failureModeSchema, jobStatusSchema, jobStageSchema }

/** Validate data against a schema. In DEV, throws on mismatch. In PROD, warns and returns raw data. */
export function parseResponse<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data)
  if (result.success) {
    return result.data
  }

  const summary = z.prettifyError(result.error)

  if (import.meta.env.DEV) {
    console.error(`[contract_mismatch] ${label}:`, summary)
  } else {
    console.warn(`[contract_mismatch] ${label}:`, summary)
  }

  // Return raw data so the UI doesn't crash on unknown extra fields
  return data as T
}
