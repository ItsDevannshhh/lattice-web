import { InlineAlert } from '@/components/feedback/InlineAlert'
import { ShieldCheck } from 'lucide-react'

interface ResultsBannerProps {
  candidateCount: number
  allMet: boolean
}

export function ResultsBanner({ candidateCount, allMet }: ResultsBannerProps) {
  if (candidateCount === 0) return null

  return allMet ? (
    <InlineAlert variant="info">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        All {candidateCount} designs are solver-verified.
      </div>
    </InlineAlert>
  ) : (
    <InlineAlert variant="warning">
      No design met every target within tolerance. Showing the closest {candidateCount}.
    </InlineAlert>
  )
}
