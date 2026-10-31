import type { ReachResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { SourceTag } from '@/components/ui/source-tag'
import { AXES, AXIS_LABELS } from '@/config/constants'
import { Check, Undo2 } from 'lucide-react'

interface ClosestAchievableProps {
  reach: ReachResponse
  isAdjusted: boolean
  onAccept: (nearest: ReachResponse['nearest']) => void
  onUndo: () => void
}

export function ClosestAchievable({
  reach,
  isAdjusted,
  onAccept,
  onUndo,
}: ClosestAchievableProps) {
  const { nearest, requested, bounds, level } = reach
  const isInfeasible = level === 'infeasible'

  const hasStiffnessDiff = nearest.stiffness_gpa.some(
    (v, i) => requested.stiffness_gpa[i] != null && Math.abs(v - (requested.stiffness_gpa[i] ?? 0)) > 0.05,
  )

  const hasStrengthDiff = nearest.strength_mpa.some(
    (v, i) => requested.strength_mpa[i] != null && Math.abs(v - (requested.strength_mpa[i] ?? 0)) > 0.5,
  )

  if (!hasStiffnessDiff && !hasStrengthDiff && !isInfeasible) {
    return null
  }

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text">Nearest achievable target</span>
          <SourceTag source={isAdjusted ? 'adjusted' : 'stored'} />
        </div>
        <div>
          {isAdjusted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUndo}
              className="h-7 text-xs"
            >
              <Undo2 className="mr-1 h-3 w-3" />
              Undo adjustments
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onAccept(nearest)}
              className="h-7 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              Accept nearest
            </Button>
          )}
        </div>
      </div>

      {isInfeasible && bounds && (
        <div className="rounded border border-danger/30 bg-danger/10 p-2 text-danger">
          <p className="font-medium">Physical bound constraint:</p>
          <p>
            Stiffness sum cannot exceed ≈ {bounds.stiffness_sum_max_gpa.toFixed(1)} GPa and strength cannot exceed ≈ {bounds.strength_max_mpa.toFixed(1)} MPa at ρ = {reach.density}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-line">
        {/* Stiffness comparisons */}
        <div className="sm:pr-4">
          <span className="font-medium text-muted">Stiffness (GPa):</span>
          <div className="mt-1 space-y-1">
            {AXES.map((axis, i) => {
              const req = requested.stiffness_gpa[i]
              const near = nearest.stiffness_gpa[i]
              if (req == null) return null
              return (
                <div key={axis} className="flex justify-between font-mono tabular-nums">
                  <span className="text-muted">{AXIS_LABELS[axis]}:</span>
                  <span>
                    <span className="text-muted line-through">{req.toFixed(2)}</span>
                    <span className="text-faint mx-1.5">&rarr;</span>
                    <span className="text-accent font-medium">{near.toFixed(2)}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Strength comparisons */}
        <div className="sm:pl-4">
          <span className="font-medium text-muted">Strength (MPa):</span>
          <div className="mt-1 space-y-1">
            {AXES.map((axis, i) => {
              const req = requested.strength_mpa[i]
              const near = nearest.strength_mpa[i]
              if (req == null) return null
              return (
                <div key={axis} className="flex justify-between font-mono tabular-nums">
                  <span className="text-muted">{AXIS_LABELS[axis]}:</span>
                  <span>
                    <span className="text-muted line-through">{req.toFixed(1)}</span>
                    <span className="text-faint mx-1.5">&rarr;</span>
                    <span className="text-accent font-medium">{near.toFixed(1)}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

