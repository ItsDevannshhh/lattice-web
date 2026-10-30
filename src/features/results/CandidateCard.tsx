import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import type { Candidate, DesignRequest } from '@/api/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AXES, AXIS_LABELS, designPath } from '@/config/constants'
import { evaluateAxis } from '@/lib/compare'
import { fmtPct, fmtMass, fmtRelDensity } from '@/lib/format'
import { Check, X, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

const LatticeViewer = lazy(() => import('@/components/LatticeViewer'))

interface CandidateCardProps {
  candidate: Candidate
  jobId: string
  request: DesignRequest | null
}

export function CandidateCard({ candidate, jobId, request }: CandidateCardProps) {
  const tolerance = request?.tolerance_pct ?? 10

  return (
    <Link to={designPath(jobId, candidate.id)}>
      <Card hover className="relative h-full overflow-hidden transition-all">
        {/* Rank ribbon */}
        {candidate.rank === 1 && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="accent">Best match</Badge>
          </div>
        )}

        <div className="space-y-3 p-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-text text-lg font-bold">#{candidate.rank}</span>
            <Badge
              variant={
                candidate.match_error_pct <= tolerance
                  ? 'success'
                  : candidate.match_error_pct <= tolerance * 2
                    ? 'warning'
                    : 'danger'
              }
            >
              {fmtPct(candidate.match_error_pct)} error
            </Badge>
          </div>

          {/* Lattice preview */}
          <div className="bg-surface-2 aspect-square overflow-hidden rounded-lg">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <LatticeViewer lattice={candidate.lattice} variant="thumbnail" />
            </Suspense>
          </div>

          {/* Stats */}
          <div className="text-muted flex gap-3 text-xs">
            <span>{fmtMass(candidate.mass_g)}</span>
            <span>ρ = {fmtRelDensity(candidate.rel_density)}</span>
          </div>

          {/* Per-axis results */}
          {request && (
            <div className="space-y-1">
              {/* Stiffness */}
              {AXES.map((axis) => {
                const target = request.target.stiffness_gpa[axis]
                if (target === null) return null
                const verified = candidate.verified.stiffness_gpa[axis]
                const result = evaluateAxis({
                  target,
                  value: verified,
                  mode: request.modes.stiffness,
                  tolerancePct: tolerance,
                })
                return (
                  <AxisRow
                    key={`stiff-${axis}`}
                    axis={axis}
                    label="Stiffness"
                    value={verified}
                    unit="GPa"
                    target={target}
                    status={result.status}
                  />
                )
              })}

              {/* Strength */}
              {AXES.map((axis) => {
                const strengthKey =
                  'strength_mpa' in request.target ? 'strength_mpa' : 'yield_strength_mpa'
                const targets = request.target[strengthKey as keyof typeof request.target] as
                  Record<string, number | null> | undefined
                const target = targets?.[axis] ?? null
                if (target === null) return null
                const verified = candidate.verified.strength_mpa[axis]
                const result = evaluateAxis({
                  target,
                  value: verified,
                  mode: request.modes.strength,
                  tolerancePct: tolerance,
                })
                return (
                  <AxisRow
                    key={`str-${axis}`}
                    axis={axis}
                    label="Strength"
                    value={verified}
                    unit="MPa"
                    target={target}
                    status={result.status}
                  />
                )
              })}
            </div>
          )}

          <div className="border-line border-t pt-2">
            <span className="text-accent text-xs font-medium">Open design →</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

function AxisRow({
  axis,
  label,
  value,
  unit,
  target,
  status,
}: {
  axis: string
  label: string
  value: number
  unit: string
  target: number
  status: 'pass' | 'fail' | 'ignored'
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">
        {label}{' '}
        <span
          className={cn(
            'font-semibold',
            axis === 'x' && 'text-axis-x',
            axis === 'y' && 'text-axis-y',
            axis === 'z' && 'text-axis-z',
          )}
        >
          {AXIS_LABELS[axis as 'x' | 'y' | 'z']}
        </span>
      </span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono tabular-nums">
          {value.toFixed(1)} {unit}
        </span>
        <span className="text-faint">/ {target}</span>
        {status === 'pass' && <Check className="text-success h-3.5 w-3.5" />}
        {status === 'fail' && <X className="text-danger h-3.5 w-3.5" />}
        {status === 'ignored' && <Minus className="text-faint h-3.5 w-3.5" />}
      </div>
    </div>
  )
}
