import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createDesign } from '@/api/endpoints'
import { saveRequest, addRecentRun } from '@/lib/storage'
import { jobPath } from '@/config/constants'
import type { DesignRequest } from '@/api/types'

export function useCreateDesign() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (request: DesignRequest) => createDesign(request),
    onSuccess: (data, request) => {
      const { job_id } = data

      // Save the request for later display
      saveRequest(job_id, request)

      // Add to recent runs
      const stiffX = 'stiffness_gpa' in request.target ? request.target.stiffness_gpa.x : null
      const summary = stiffX !== null ? `Stiffness X: ${stiffX} GPa` : 'Custom design'

      addRecentRun({
        jobId: job_id,
        material: request.material,
        summary,
        timestamp: Date.now(),
      })

      navigate(jobPath(job_id))
    },
  })
}
