import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
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

function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
  })

  // Error normalisation interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error)) {
        // Backend structured error
        const body = error.response?.data as
          { error?: { code?: string; message?: string } } | undefined
        if (body?.error?.code && body?.error?.message) {
          throw new ApiError(body.error.code, body.error.message, error.response?.status)
        }

        // No response / timeout / network
        if (!error.response) {
          throw new ApiError('network_error', "Can't reach the Lattice Designer service.")
        }

        // Other HTTP errors
        throw new ApiError(
          'unknown',
          error.response?.statusText ?? 'An unexpected error occurred.',
          error.response?.status,
        )
      }

      throw new ApiError('unknown', 'An unexpected error occurred.')
    },
  )

  // Install mock adapter when USE_MOCK is true
  if (USE_MOCK) {
    import('@/mocks/adapter').then(({ mockAdapter }) => {
      instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
        config.adapter = mockAdapter
        return config
      })
    })
  }

  return instance
}

export const apiClient = createClient()
