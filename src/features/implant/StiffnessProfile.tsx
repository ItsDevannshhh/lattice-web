import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface ProfilePoint {
  position_mm: number
  stiffness_gpa: number
  target_gpa?: number | null
}

interface StiffnessProfileProps {
  profile?: ProfilePoint[]
  zoneBoundaries?: number[]
}

export function StiffnessProfile({
  profile = [],
  zoneBoundaries = [40, 95, 135],
}: StiffnessProfileProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ProfilePoint | null>(null)

  if (profile.length === 0) return null

  const width = 640
  const height = 240
  const padding = { top: 20, right: 30, bottom: 40, left: 50 }

  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxPos = Math.max(160, ...profile.map((p) => p.position_mm))
  const maxStiff = Math.max(
    20,
    ...profile.map((p) => Math.max(p.stiffness_gpa, p.target_gpa ?? 0)),
  )

  const scaleX = (pos: number) => padding.left + (pos / maxPos) * chartW
  const scaleY = (stiff: number) => padding.top + chartH - (stiff / maxStiff) * chartH

  // Build points for achieved stiffness line
  const achievedPath = profile
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.position_mm)} ${scaleY(p.stiffness_gpa)}`)
    .join(' ')

  // Build step line for target
  const targetPathSegments: string[] = []
  profile.forEach((p, i) => {
    if (p.target_gpa == null) return
    const x = scaleX(p.position_mm)
    const y = scaleY(p.target_gpa)
    if (targetPathSegments.length === 0) {
      targetPathSegments.push(`M ${x} ${y}`)
    } else {
      targetPathSegments.push(`L ${x} ${scaleY(profile[i - 1].target_gpa ?? p.target_gpa)}`)
      targetPathSegments.push(`L ${x} ${y}`)
    }
  })
  const targetPath = targetPathSegments.join(' ')

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-text">
              Axial Stiffness Profile (GPa vs mm)
            </h3>
            <p className="text-xs text-muted">
              Continuous stiffness gradient along implant length. Avoids stress shielding.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded bg-accent" /> Achieved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-muted" /> Target
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[500px]"
            aria-label="Stiffness Profile Chart"
          >
            {/* Grid lines */}
            {[0, 5, 10, 15, 20].map((val) => {
              const y = scaleY(val)
              return (
                <g key={val} className="text-faint text-[10px] font-mono">
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="var(--color-line)"
                    strokeDasharray="2,2"
                  />
                  <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="currentColor">
                    {val}
                  </text>
                </g>
              )
            })}

            {/* X-axis tick labels */}
            {[0, 40, 80, 120, 160].map((pos) => {
              const x = scaleX(pos)
              return (
                <g key={pos} className="text-faint text-[10px] font-mono">
                  <line
                    x1={x}
                    y1={padding.top + chartH}
                    x2={x}
                    y2={padding.top + chartH + 5}
                    stroke="var(--color-line)"
                  />
                  <text
                    x={x}
                    y={padding.top + chartH + 18}
                    textAnchor="middle"
                    fill="currentColor"
                  >
                    {pos}mm
                  </text>
                </g>
              )
            })}

            {/* Zone boundary vertical guides */}
            {zoneBoundaries.map((b, i) => {
              const x = scaleX(b)
              return (
                <line
                  key={i}
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartH}
                  stroke="var(--color-accent)"
                  strokeOpacity={0.4}
                  strokeDasharray="4,4"
                />
              )
            })}

            {/* Target line (dashed step) */}
            {targetPath && (
              <path
                d={targetPath}
                fill="none"
                stroke="var(--color-muted)"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />
            )}

            {/* Achieved stiffness line */}
            <path
              d={achievedPath}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
            />

            {/* Interactive points */}
            {profile.map((p, i) => {
              const cx = scaleX(p.position_mm)
              const cy = scaleY(p.stiffness_gpa)
              const isHovered = hoveredPoint?.position_mm === p.position_mm

              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 3}
                  className="fill-accent stroke-surface cursor-pointer transition-all"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  tabIndex={0}
                  onFocus={() => setHoveredPoint(p)}
                  onBlur={() => setHoveredPoint(null)}
                />
              )
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 right-4 rounded-md border border-line bg-surface p-2 text-xs shadow-md font-mono">
              <p className="text-text font-semibold">Position: {hoveredPoint.position_mm} mm</p>
              <p className="text-accent">Achieved: {hoveredPoint.stiffness_gpa.toFixed(2)} GPa</p>
              {hoveredPoint.target_gpa != null && (
                <p className="text-muted">Target: {hoveredPoint.target_gpa.toFixed(2)} GPa</p>
              )}
            </div>
          )}

          {/* Visually hidden accessible data table for screen readers */}
          <table className="sr-only">
            <caption>Implant stiffness along length</caption>
            <thead>
              <tr>
                <th scope="col">Position (mm)</th>
                <th scope="col">Achieved Stiffness (GPa)</th>
                <th scope="col">Target Stiffness (GPa)</th>
              </tr>
            </thead>
            <tbody>
              {profile.map((p, i) => (
                <tr key={i}>
                  <td>{p.position_mm}</td>
                  <td>{p.stiffness_gpa}</td>
                  <td>{p.target_gpa ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
