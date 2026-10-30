import type { Candidate, DesignRequest } from '@/api/types'
import { AXES, AXIS_LABELS, designPath } from '@/config/constants'
import { evaluateAxis } from '@/lib/compare'
import { fmtPct, fmtMass, fmtRelDensity } from '@/lib/format'
import { Check, X, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface ComparisonMatrixProps {
  candidates: Candidate[]
  jobId: string
  request: DesignRequest | null
}

export function ComparisonMatrix({ candidates, jobId, request }: ComparisonMatrixProps) {
  const tolerance = request?.tolerance_pct ?? 10

  return (
    <div className="border-line overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-line bg-surface-2 border-b">
            <th className="bg-surface-2 text-muted sticky left-0 z-10 px-3 py-2 text-left font-medium">
              Rank
            </th>
            <th className="text-muted px-3 py-2 text-left font-medium">Error</th>
            <th className="text-muted px-3 py-2 text-right font-medium">Mass</th>
            <th className="text-muted px-3 py-2 text-right font-medium">ρ</th>
            {AXES.map((axis) => (
              <th key={`stiff-${axis}`} className="text-muted px-3 py-2 text-right font-medium">
                Stiff{' '}
                <span
                  className={cn(
                    axis === 'x' && 'text-axis-x',
                    axis === 'y' && 'text-axis-y',
                    axis === 'z' && 'text-axis-z',
                  )}
                >
                  {AXIS_LABELS[axis]}
                </span>
              </th>
            ))}
            {AXES.map((axis) => (
              <th key={`str-${axis}`} className="text-muted px-3 py-2 text-right font-medium">
                Str{' '}
                <span
                  className={cn(
                    axis === 'x' && 'text-axis-x',
                    axis === 'y' && 'text-axis-y',
                    axis === 'z' && 'text-axis-z',
                  )}
                >
                  {AXIS_LABELS[axis]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const strengthKey =
              request && 'strength_mpa' in request.target ? 'strength_mpa' : 'yield_strength_mpa'
            const strengthTargets = request
              ? (request.target[strengthKey as keyof typeof request.target] as
                  Record<string, number | null> | undefined)
              : null

            return (
              <tr
                key={c.id}
                className="border-line hover:bg-surface-2/50 border-b transition-colors last:border-0"
              >
                <td className="bg-surface sticky left-0 z-10 px-3 py-2 font-semibold">
                  <Link to={designPath(jobId, c.id)} className="text-accent hover:underline">
                    #{c.rank}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'font-mono tabular-nums',
                      c.match_error_pct <= tolerance ? 'text-success' : 'text-warning',
                    )}
                  >
                    {fmtPct(c.match_error_pct)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtMass(c.mass_g)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {fmtRelDensity(c.rel_density)}
                </td>
                {AXES.map((axis) => {
                  const target = request?.target.stiffness_gpa[axis] ?? null
                  const value = c.verified.stiffness_gpa[axis]
                  const result = request
                    ? evaluateAxis({
                        target,
                        value,
                        mode: request.modes.stiffness,
                        tolerancePct: tolerance,
                      })
                    : null
                  return (
                    <td key={`stiff-${axis}`} className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span
                          className={cn('font-mono tabular-nums', target === null && 'text-muted')}
                        >
                          {value.toFixed(1)}
                        </span>
                        {result && result.status === 'pass' && (
                          <Check className="text-success h-3 w-3" />
                        )}
                        {result && result.status === 'fail' && (
                          <X className="text-danger h-3 w-3" />
                        )}
                        {(result?.status === 'ignored' || !result) && target !== null && (
                          <Minus className="text-faint h-3 w-3" />
                        )}
                      </div>
                    </td>
                  )
                })}
                {AXES.map((axis) => {
                  const target = strengthTargets?.[axis] ?? null
                  const value = c.verified.strength_mpa[axis]
                  const result = request
                    ? evaluateAxis({
                        target: target as number | null,
                        value,
                        mode: request.modes.strength,
                        tolerancePct: tolerance,
                      })
                    : null
                  return (
                    <td key={`str-${axis}`} className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span
                          className={cn('font-mono tabular-nums', target === null && 'text-muted')}
                        >
                          {value.toFixed(0)}
                        </span>
                        {result && result.status === 'pass' && (
                          <Check className="text-success h-3 w-3" />
                        )}
                        {result && result.status === 'fail' && (
                          <X className="text-danger h-3 w-3" />
                        )}
                        {(result?.status === 'ignored' || !result) && target !== null && (
                          <Minus className="text-faint h-3 w-3" />
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
