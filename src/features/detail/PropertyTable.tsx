import type { Candidate, DesignRequest } from '@/api/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InfoTip } from '@/components/ui/info-tip'
import { AXES, AXIS_LABELS } from '@/config/constants'
import { evaluateAxis } from '@/lib/compare'
import { cn } from '@/lib/cn'
import { Check, X, Minus } from 'lucide-react'

interface PropertyTableProps {
  candidate: Candidate
  request: DesignRequest | null
  tolerance: number
}

export function PropertyTable({ candidate, request, tolerance }: PropertyTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <h2 className="text-text text-sm font-semibold">Properties</h2>
          <InfoTip content="Strength is a solver estimate: first-order, linear-elastic analysis. Buckling assumes pinned ends, axis-aligned loads only." />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-line border-b">
                <th className="text-muted py-2 pr-3 text-left font-medium">Property</th>
                {request && <th className="text-muted px-2 py-2 text-right font-medium">Target</th>}
                <th className="text-muted px-2 py-2 text-right font-medium">Predicted</th>
                <th className="text-muted px-2 py-2 text-right font-medium">Verified</th>
                <th className="text-muted px-2 py-2 text-right font-medium">Δ target</th>
                <th className="text-muted px-2 py-2 text-right font-medium">AI error</th>
                <th className="text-muted px-2 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Stiffness */}
              {AXES.map((axis) => {
                const target = request?.target.stiffness_gpa[axis] ?? null
                const predicted = candidate.predicted.stiffness_gpa[axis]
                const verified = candidate.verified.stiffness_gpa[axis]
                const result = evaluateAxis({
                  target,
                  value: verified,
                  mode: request?.modes.stiffness ?? 'about',
                  tolerancePct: tolerance,
                })
                const aiErr = verified !== 0 ? (Math.abs(predicted - verified) / verified) * 100 : 0

                return (
                  <tr key={`stiff-${axis}`} className="border-line/50 border-b">
                    <td className="py-1.5 pr-3">
                      Stiffness{' '}
                      <span className={cn('font-semibold', `text-axis-${axis}`)}>
                        {AXIS_LABELS[axis]}
                      </span>
                      <span className="text-faint ml-1">GPa</span>
                    </td>
                    {request && (
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {target !== null ? target.toFixed(1) : '—'}
                      </td>
                    )}
                    <td className="text-muted px-2 py-1.5 text-right font-mono tabular-nums">
                      {predicted.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium tabular-nums">
                      {verified.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {target !== null ? `${result.errorPct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="text-muted px-2 py-1.5 text-right font-mono tabular-nums">
                      {aiErr.toFixed(1)}%
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <StatusIcon status={result.status} />
                    </td>
                  </tr>
                )
              })}

              {/* Strength */}
              {AXES.map((axis) => {
                const strengthKey =
                  request && 'strength_mpa' in request.target
                    ? 'strength_mpa'
                    : 'yield_strength_mpa'
                const targets = request
                  ? (request.target[strengthKey as keyof typeof request.target] as
                      Record<string, number | null> | undefined)
                  : null
                const target = (targets?.[axis] as number | null) ?? null
                const predicted = candidate.predicted.strength_mpa[axis]
                const verified = candidate.verified.strength_mpa[axis]
                const result = evaluateAxis({
                  target,
                  value: verified,
                  mode: request?.modes.strength ?? 'at_least',
                  tolerancePct: tolerance,
                })
                const aiErr = verified !== 0 ? (Math.abs(predicted - verified) / verified) * 100 : 0

                return (
                  <tr key={`str-${axis}`} className="border-line/50 border-b">
                    <td className="py-1.5 pr-3">
                      Strength{' '}
                      <span className={cn('font-semibold', `text-axis-${axis}`)}>
                        {AXIS_LABELS[axis]}
                      </span>
                      <span className="text-faint ml-1">MPa</span>
                    </td>
                    {request && (
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {target !== null ? target.toFixed(0) : '—'}
                      </td>
                    )}
                    <td className="text-muted px-2 py-1.5 text-right font-mono tabular-nums">
                      {predicted.toFixed(0)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium tabular-nums">
                      {verified.toFixed(0)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {target !== null ? `${result.errorPct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="text-muted px-2 py-1.5 text-right font-mono tabular-nums">
                      {aiErr.toFixed(1)}%
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <StatusIcon status={result.status} />
                    </td>
                  </tr>
                )
              })}

              {/* Sub-rows: Yield, Buckling, Governing failure */}
              {AXES.map((axis) => (
                <tr key={`sub-${axis}`} className="border-line/30 text-muted border-b">
                  <td className="py-1 pr-3 pl-4 text-[11px]" colSpan={request ? 2 : 1}>
                    <span className={cn('font-medium', `text-axis-${axis}`)}>
                      {AXIS_LABELS[axis]}
                    </span>{' '}
                    Yield {candidate.verified.yield_strength_mpa[axis].toFixed(0)} · Buckling{' '}
                    {candidate.verified.buckling_strength_mpa[axis].toFixed(0)} · Gov:{' '}
                    {candidate.verified.governing_failure[axis]}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusIcon({ status }: { status: 'pass' | 'fail' | 'ignored' }) {
  if (status === 'pass') return <Check className="text-success inline h-3.5 w-3.5" />
  if (status === 'fail') return <X className="text-danger inline h-3.5 w-3.5" />
  return <Minus className="text-faint inline h-3.5 w-3.5" />
}
