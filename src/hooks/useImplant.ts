/**
 * Implant workflow hooks — PROVISIONAL.
 * Communicates with /api/implants endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { getMeshBlob, storeMeshBlob } from '@/lib/meshStore'
import type {
  CreateImplantResponse,
  ConfirmImplantRequest,
  Zone,
  ZoneCandidates,
  ImplantResult,
} from '@/api/implantTypes'

export function useCreateImplant() {
  return useMutation({
    mutationFn: async (params: {
      file?: File | Blob
      material: string
      description: string
    }): Promise<CreateImplantResponse> => {
      const formData = new FormData()
      if (params.file) {
        formData.append('stl_file', params.file)
      }
      formData.append('material', params.material)
      formData.append('description', params.description)

      const { data } = await apiClient.post<CreateImplantResponse>('/api/implants', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Store mesh blob in IndexedDB for 3D visualization across refreshes
      if (params.file) {
        await storeMeshBlob(data.implant_id, params.file)
      }

      return data
    },
  })
}

export function useConfirmImplant(implantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (confirmData: ConfirmImplantRequest) => {
      const { data } = await apiClient.post(`/api/implants/${implantId}/confirm`, confirmData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.implantZones(implantId) })
    },
  })
}

export function useImplantZones(implantId: string) {
  const queryClient = useQueryClient()

  const query = useQuery<Zone[]>({
    queryKey: queryKeys.implantZones(implantId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/implants/${implantId}/zones`)
      // Accept either bare array or { zones: [...] } per section 3
      if (Array.isArray(data)) return data
      if (data && typeof data === 'object' && 'zones' in data) {
        return (data as { zones: Zone[] }).zones
      }
      return []
    },
    enabled: !!implantId,
  })

  const updateMutation = useMutation({
    mutationFn: async (zones: Zone[]): Promise<Zone[]> => {
      const { data } = await apiClient.put(`/api/implants/${implantId}/zones`, { zones })
      if (Array.isArray(data)) return data
      if (data && typeof data === 'object' && 'zones' in data) {
        return (data as { zones: Zone[] }).zones
      }
      return zones
    },
    onSuccess: (updatedZones) => {
      queryClient.setQueryData(queryKeys.implantZones(implantId), updatedZones)
    },
  })

  return {
    ...query,
    updateZones: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  }
}

export function useSearchImplantZones(implantId: string) {
  return useMutation({
    mutationFn: async (): Promise<Record<string, string>> => {
      const { data } = await apiClient.post<Record<string, string>>(
        `/api/implants/${implantId}/search`,
      )
      return data
    },
  })
}

export function useZoneCandidates(implantId: string, zoneId: string) {
  return useQuery<ZoneCandidates>({
    queryKey: queryKeys.zoneCandidates(implantId, zoneId),
    queryFn: async () => {
      const { data } = await apiClient.get<ZoneCandidates>(
        `/api/implants/${implantId}/zones/${zoneId}/candidates`,
      )
      return data
    },
    enabled: !!implantId && !!zoneId,
  })
}

export function useAssembleImplant(implantId: string) {
  return useMutation({
    mutationFn: async (choices: Record<string, string>): Promise<{ job_id: string }> => {
      const { data } = await apiClient.post<{ job_id: string }>(
        `/api/implants/${implantId}/assemble`,
        { choices },
      )
      return data
    },
  })
}

export function useImplantResult(implantId: string) {
  return useQuery<ImplantResult>({
    queryKey: queryKeys.implantResult(implantId),
    queryFn: async () => {
      const { data } = await apiClient.get<ImplantResult>(`/api/implants/${implantId}/result`)
      return data
    },
    enabled: !!implantId,
  })
}

export function useStoredMesh(implantId: string) {
  return useQuery<Blob | null>({
    queryKey: ['stored-mesh', implantId],
    queryFn: () => getMeshBlob(implantId),
    enabled: !!implantId,
    staleTime: Infinity,
  })
}

