import { InlineAlert } from '@/components/feedback/InlineAlert'
import { AlertTriangle } from 'lucide-react'

export function ImplantBanner() {
  return (
    <InlineAlert variant="warning" className="border-warning/30 bg-warning/10">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
        <div className="text-xs text-text space-y-0.5">
          <p className="font-semibold text-warning">
            Medical &amp; Clinical Disclaimer: Design aid only.
          </p>
          <p className="text-muted">
            Strength is static (no fatigue); a finite printed part is slightly softer than the infinite theoretical lattice; physical printing and biomechanical testing are required before any clinical or surgical claim.
          </p>
        </div>
      </div>
    </InlineAlert>
  )
}

