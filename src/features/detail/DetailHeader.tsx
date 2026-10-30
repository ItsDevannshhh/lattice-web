import { Link } from 'react-router-dom'
import type { Candidate } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { designPath, jobPath } from '@/config/constants'
import { fmtPct } from '@/lib/format'
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react'

interface DetailHeaderProps {
  candidate: Candidate
  jobId: string
  prevId: string | null
  nextId: string | null
  tolerance: number
}

export function DetailHeader({ candidate, jobId, prevId, nextId, tolerance }: DetailHeaderProps) {
  return (
    <>
      {/* Title + nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={jobPath(jobId)} className="text-muted hover:text-text">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-text text-xl font-semibold">
            Design <span className="text-accent font-mono">{candidate.id}</span>
          </h1>
          <Badge variant={candidate.match_error_pct <= tolerance ? 'success' : 'warning'}>
            #{candidate.rank} · {fmtPct(candidate.match_error_pct)} error
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {prevId && (
            <Link to={designPath(jobId, prevId)}>
              <Button variant="ghost" size="sm" aria-label="Previous design">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {nextId && (
            <Link to={designPath(jobId, nextId)}>
              <Button variant="ghost" size="sm" aria-label="Next design">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="text-muted flex items-center gap-1.5 text-xs">
        <Link to="/" className="hover:text-accent">
          Design
        </Link>
        <span>›</span>
        <Link to={jobPath(jobId)} className="hover:text-accent font-mono">
          {jobId}
        </Link>
        <span>›</span>
        <span className="text-accent font-mono">{candidate.id}</span>
      </nav>
    </>
  )
}
