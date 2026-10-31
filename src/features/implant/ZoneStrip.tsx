import { useState } from 'react'
import type { Zone } from '@/api/implantTypes'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

interface ZoneStripProps {
  zones: Zone[]
  totalLengthMm?: number
  onBoundaryChange: (index: number, newBoundaryMm: number) => void
  activeZoneId?: string
  onSelectZone?: (zoneId: string) => void
}

const ZONE_COLORS = [
  'bg-cyan-500/20 border-cyan-500 text-cyan-400',
  'bg-emerald-500/20 border-emerald-500 text-emerald-400',
  'bg-amber-500/20 border-amber-500 text-amber-400',
  'bg-purple-500/20 border-purple-500 text-purple-400',
  'bg-rose-500/20 border-rose-500 text-rose-400',
  'bg-blue-500/20 border-blue-500 text-blue-400',
]

export function ZoneStrip({
  zones,
  totalLengthMm = 160,
  onBoundaryChange,
  activeZoneId,
  onSelectZone,
}: ZoneStripProps) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)

  // Internal boundaries are between zones: zone[i].range_mm[1]
  const boundaries = zones.slice(0, -1).map((z) => z.range_mm[1])

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    const current = boundaries[idx]
    const min = idx === 0 ? 1 : boundaries[idx - 1] + 1
    const max = idx === boundaries.length - 1 ? totalLengthMm - 1 : boundaries[idx + 1] - 1

    let delta = 0
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = 1

    if (delta !== 0) {
      e.preventDefault()
      const next = Math.max(min, Math.min(max, current + delta))
      onBoundaryChange(idx, next)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-text">Axial Zone Segmentation (0–{totalLengthMm} mm)</span>
        <span className="text-muted text-[11px]">
          Click zone to select · Drag boundary or use arrow keys
        </span>
      </div>

      {/* Visual strip */}
      <div className="relative h-12 w-full rounded-lg bg-surface-2 overflow-hidden border border-line flex">
        {zones.map((zone, i) => {
          const widthPct = ((zone.range_mm[1] - zone.range_mm[0]) / totalLengthMm) * 100
          const colorClass = ZONE_COLORS[i % ZONE_COLORS.length]
          const isSelected = activeZoneId === zone.id

          return (
            <div
              key={zone.id}
              onClick={() => onSelectZone?.(zone.id)}
              style={{ width: `${widthPct}%` }}
              className={cn(
                'relative h-full border-r border-line/80 flex flex-col items-center justify-center cursor-pointer transition-all p-1 text-center select-none',
                colorClass,
                isSelected && 'ring-2 ring-accent ring-inset font-bold',
              )}
            >
              <span className="truncate text-[11px] font-medium leading-none">
                {zone.name || `Zone ${i + 1}`}
              </span>
              <span className="text-[10px] opacity-75 font-mono">
                {zone.range_mm[0]}–{zone.range_mm[1]} mm
              </span>
              <Badge
                variant={zone.kind === 'solid' ? 'neutral' : 'accent'}
                className="text-[9px] px-1 py-0 mt-0.5"
              >
                {zone.kind}
              </Badge>
            </div>
          )
        })}

        {/* Draggable handles */}
        {boundaries.map((boundary, idx) => {
          const leftPct = (boundary / totalLengthMm) * 100
          return (
            <div
              key={idx}
              tabIndex={0}
              role="slider"
              aria-label={`Boundary between zone ${idx + 1} and ${idx + 2}`}
              aria-valuenow={boundary}
              aria-valuemin={idx === 0 ? 1 : boundaries[idx - 1] + 1}
              aria-valuemax={idx === boundaries.length - 1 ? totalLengthMm - 1 : boundaries[idx + 1] - 1}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onMouseDown={() => setDraggingIdx(idx)}
              onMouseUp={() => setDraggingIdx(null)}
              style={{ left: `${leftPct}%` }}
              className={cn(
                'absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-accent',
                draggingIdx === idx && 'z-30',
              )}
            >
              <div className="w-1 h-full bg-accent/70 group-hover:bg-accent group-focus:bg-accent rounded-full shadow-sm" />
            </div>
          )
        })}
      </div>

      {/* Numeric inputs for exact precision */}
      <div className="flex flex-wrap gap-3 pt-1 border-t border-line/40 text-xs">
        {boundaries.map((b, idx) => (
          <div key={idx} className="flex items-center gap-1.5 font-mono">
            <span className="text-muted">Split {idx + 1}:</span>
            <input
              type="number"
              min={idx === 0 ? 1 : boundaries[idx - 1] + 1}
              max={idx === boundaries.length - 1 ? totalLengthMm - 1 : boundaries[idx + 1] - 1}
              value={b}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (isFinite(val)) onBoundaryChange(idx, val)
              }}
              className="w-16 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-center text-xs text-text focus:border-accent focus:outline-none"
            />
            <span className="text-muted text-[11px]">mm</span>
          </div>
        ))}
      </div>
    </div>
  )
}

