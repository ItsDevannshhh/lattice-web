import axios from 'axios'
import type { AxiosAdapter, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { API_BASE, USE_MOCK } from '@/config/env'

export class ApiError extends Error {
  code: string
  status?: number

  constructor(code: string, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function statusToCode(status: number): string {
  if (status === 404) return 'not_found'
  if (status === 422) return 'bad_target'
  if (status === 429) return 'queue_full'
  return 'unknown'
}

let mockAdapterFn: AxiosAdapter | null = null

// Pre-load mock adapter
if (USE_MOCK) {
  import('@/mocks/adapter').then(({ mockAdapter }) => {
    mockAdapterFn = mockAdapter as unknown as AxiosAdapter
  })
}

function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
  })

  // Mock adapter interceptor — always uses the pre-loaded function
  if (USE_MOCK) {
    instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (mockAdapterFn) {
        config.adapter = mockAdapterFn
      }
      return config
    })
  }

  // Error normalisation interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error)) {
        // Backend structured error
        const body = error.response?.data as
          | { error?: { code?: string; message?: string } }
          | undefined
        if (body?.error?.code && body?.error?.message) {
          throw new ApiError(body.error.code, body.error.message, error.response?.status)
        }

        // No response / timeout / network
        if (!error.response) {
          throw new ApiError(
            'network_error',
            'Can\u2019t reach the Lattice Designer service.',
          )
        }

        // Status-based fallback
        const code = statusToCode(error.response.status)
        throw new ApiError(
          code,
          error.response?.statusText ?? 'An unexpected error occurred.',
          error.response?.status,
        )
      }

      throw new ApiError('unknown', 'An unexpected error occurred.')
    },
  )

  return instance
}

export const apiClient = createClient()
