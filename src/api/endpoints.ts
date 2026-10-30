import type {
  Candidate,
  CreateDesignResponse,
  DesignRequest,
  HealthResponse,
  Job,
  Material,
} from '@/api/types'
import { apiClient } from '@/api/client'
import {
  candidateSchema,
  createDesignResponseSchema,
  healthSchema,
  jobSchema,
  materialsListSchema,
  parseResponse,
} from '@/api/schemas'

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get('/api/health')
  return parseResponse(healthSchema, data, 'GET /api/health')
}

export async function getMaterials(): Promise<Material[]> {
  const { data } = await apiClient.get('/api/materials')
  return parseResponse(materialsListSchema, data, 'GET /api/materials')
}

export async function createDesign(request: DesignRequest): Promise<CreateDesignResponse> {
  const { data } = await apiClient.post('/api/designs', request)
  return parseResponse(createDesignResponseSchema, data, 'POST /api/designs')
}

export async function getJob(jobId: string): Promise<Job> {
  const { data } = await apiClient.get(`/api/jobs/${jobId}`)
  return parseResponse(jobSchema, data, `GET /api/jobs/${jobId}`)
}

export async function getDesign(designId: string): Promise<Candidate> {
  const { data } = await apiClient.get(`/api/designs/${designId}`)
  return parseResponse(candidateSchema, data, `GET /api/designs/${designId}`)
}
