import { InlineAlert } from '@/components/feedback/InlineAlert'
import { MIN_PRINT_DIAMETER_MM } from '@/config/constants'
import { fmtMm } from '@/lib/format'

interface PrintabilityNoticeProps {
  strutDiameter: number
}

export function PrintabilityNotice({ strutDiameter }: PrintabilityNoticeProps) {
  const isThin = strutDiameter < MIN_PRINT_DIAMETER_MM

  return isThin ? (
    <InlineAlert variant="warning">
      Strut diameter ({fmtMm(strutDiameter)}) is below {MIN_PRINT_DIAMETER_MM} mm — may be too thin
      for most nozzles. STL not yet checked against a specific printer.
    </InlineAlert>
  ) : (
    <InlineAlert variant="info">
      Strut diameter OK for a 0.4 mm nozzle ({fmtMm(strutDiameter)}). STL not yet checked against a
      specific printer.
    </InlineAlert>
  )
}
