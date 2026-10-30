import { Badge } from '@/components/ui/badge'
import type { DesignRequest } from '@/api/types'
import { AXES, AXIS_LABELS, MODE_LABELS } from '@/config/constants'

interface TargetChipsProps {
  request: DesignRequest
}

export function TargetChips({ request }: TargetChipsProps) {
  const chips: Array<{ label: string; variant: 'neutral' }> = []

  // Stiffness
  const stiff = request.target.stiffness_gpa
  AXES.forEach((axis) => {
    const val = stiff[axis]
    if (val !== null) {
      chips.push({
        label: `Stiffness ${AXIS_LABELS[axis]} ${val} GPa · ${MODE_LABELS[request.modes.stiffness]}${request.modes.stiffness === 'about' ? ` ±${request.tolerance_pct}%` : ''}`,
        variant: 'neutral',
      })
    }
  })

  // Strength
  const strengthKey = 'strength_mpa' in request.target ? 'strength_mpa' : 'yield_strength_mpa'
  const strengthVals = request.target[strengthKey as keyof typeof request.target] as
    Record<string, number | null> | undefined
  if (strengthVals && typeof strengthVals === 'object') {
    AXES.forEach((axis) => {
      const val = strengthVals[axis]
      if (val !== null && val !== undefined) {
        chips.push({
          label: `Strength ${AXIS_LABELS[axis]} ${val} MPa · ${MODE_LABELS[request.modes.strength]}`,
          variant: 'neutral',
        })
      }
    })
  }

  // Weight
  if ('max_mass_g' in request.target) {
    chips.push({
      label: `Mass ≤ ${request.target.max_mass_g} g · ${MODE_LABELS[request.modes.weight]}`,
      variant: 'neutral',
    })
  } else if ('rel_density' in request.target) {
    chips.push({
      label: `ρ ≤ ${request.target.rel_density} · ${MODE_LABELS[request.modes.weight]}`,
      variant: 'neutral',
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge key={chip.label} variant={chip.variant} className="font-mono text-[11px]">
          {chip.label}
        </Badge>
      ))}
    </div>
  )
}
