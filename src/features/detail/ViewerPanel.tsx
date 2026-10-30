import { Suspense, lazy } from 'react'
import type { Lattice } from '@/api/types'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'

const LatticeViewer = lazy(() => import('@/components/LatticeViewer'))

interface ViewerPanelProps {
  lattice: Lattice
  tiles: number
  onTilesChange: (tiles: number) => void
  renderMode: 'solid' | 'wireframe'
  onRenderModeChange: (mode: 'solid' | 'wireframe') => void
  colorByAxis: boolean
  onColorByAxisChange: (v: boolean) => void
}

export function ViewerPanel({
  lattice,
  tiles,
  onTilesChange,
  renderMode,
  onRenderModeChange,
  colorByAxis,
  onColorByAxisChange,
}: ViewerPanelProps) {
  return (
    <div className="space-y-3 lg:sticky lg:top-20">
      <div className="bg-surface-2 border-line aspect-[4/3] overflow-hidden rounded-lg border">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <LatticeViewer
            lattice={lattice}
            variant="full"
            tiles={tiles}
            renderMode={renderMode}
            colorByAxis={colorByAxis}
          />
        </Suspense>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-muted text-xs">Tiles</label>
          <input
            type="range"
            min={1}
            max={5}
            value={tiles}
            onChange={(e) => onTilesChange(parseInt(e.target.value))}
            className="accent-accent w-20"
          />
          <span className="w-4 font-mono text-xs tabular-nums">{tiles}</span>
        </div>
        <Segmented
          value={renderMode}
          onChange={(v) => onRenderModeChange(v as 'solid' | 'wireframe')}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'wireframe', label: 'Wire' },
          ]}
        />
        <label className="text-muted flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={colorByAxis}
            onChange={(e) => onColorByAxisChange(e.target.checked)}
            className="accent-accent cursor-pointer"
          />
          Colour by axis
        </label>
      </div>

      <div className="text-muted space-y-1 text-xs">
        <p>
          {lattice.nodes.length} nodes · {lattice.edges.length} edges
        </p>
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="bg-axis-x h-2 w-2 rounded-full" /> X
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-axis-y h-2 w-2 rounded-full" /> Y
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-axis-z h-2 w-2 rounded-full" /> Z
          </span>
        </div>
      </div>
    </div>
  )
}
