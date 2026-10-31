import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import type { Candidate, DesignRequest } from '@/api/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SourceTag } from '@/components/ui/source-tag'
import { Skeleton } from '@/components/ui/skeleton'
import { AXES, AXIS_LABELS, designPath, AT_LEAST_STRENGTH_SLACK } from '@/config/constants'
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
    <Link to={designPath(jobId, candidate.id)} className="block h-full">
      <Card hover className="relative flex h-full flex-col overflow-hidden transition-all">
        {/* Badges / Ribbons */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
          {candidate.rank === 1 && candidate.matches_targets && (
            <Badge variant="accent">Best match</Badge>
          )}
          {!candidate.matches_targets && (
            <Badge variant="warning">Closest, not a match</Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="text-text text-lg font-bold font-mono">#{candidate.rank}</span>
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
              {candidate.matches_targets && (
                <span className="text-xs text-success font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" /> Within target
                </span>
              )}
            </div>

            {/* Lattice preview */}
            <div className="bg-surface-2 aspect-square overflow-hidden rounded-lg">
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <LatticeViewer lattice={candidate.lattice} variant="thumbnail" />
              </Suspense>
            </div>

            {/* Stats */}
            <div className="text-muted flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <span>{fmtMass(candidate.mass_g)}</span>
                <SourceTag source="estimate" />
              </span>
              <span>&rho; = {fmtRelDensity(candidate.rel_density)}</span>
              <span className="font-mono text-faint">r={candidate.lattice.strut_radius_mm.toFixed(2)}mm</span>
            </div>

            {/* Per-axis results */}
            {request && (
              <div className="space-y-1.5 border-t border-line/50 pt-2">
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
                      label="Stiff"
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
                    | Record<string, number | null>
                    | undefined
                  const target = targets?.[axis] ?? null
                  if (target === null) return null
                  const verified = candidate.verified.strength_mpa[axis]
                  const failureMode = candidate.verified.governing_failure?.[axis]
                  const result = evaluateAxis({
                    target,
                    value: verified,
                    mode: request.modes.strength,
                    tolerancePct: tolerance,
                    slack: request.modes.strength === 'at_least' ? AT_LEAST_STRENGTH_SLACK : 0,
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
                      governingFailure={failureMode}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-line border-t pt-2 flex items-center justify-between text-xs">
            <span className="text-muted font-mono">{candidate.id}</span>
            <span className="text-accent font-medium">Open design &rarr;</span>
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
  governingFailure,
}: {
  axis: string
  label: string
  value: number
  unit: string
  target: number
  status: 'pass' | 'fail' | 'ignored'
  governingFailure?: 'yield' | 'buckling'
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted flex items-center gap-1">
        <span>{label}</span>
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
        {governingFailure && (
          <span className="text-[10px] text-faint">({governingFailure})</span>
        )}
      </span>
      <div className="flex items-center gap-1.5 font-mono tabular-nums">
        <span>
          {value.toFixed(1)} {unit}
        </span>
        <span className="text-faint">/ {target}</span>
        {status === 'pass' && (
          <span className="flex items-center text-success" title="Within target">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
        {status === 'fail' && (
          <span className="flex items-center text-danger" title="Outside target">
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        {status === 'ignored' && (
          <span className="flex items-center text-faint" title="Not targeted">
            <Minus className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}
