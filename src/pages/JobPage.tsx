import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useJob } from '@/hooks/useJob'
import { useJobEvents } from '@/hooks/useJobEvents'
import { StageStepper } from '@/features/job/StageStepper'
import { ProgressPanel } from '@/features/job/ProgressPanel'
import { ActivityLog } from '@/features/job/ActivityLog'
import { TargetChips } from '@/features/job/TargetChips'
import { CandidateGrid } from '@/features/results/CandidateGrid'
import { ComparisonMatrix } from '@/features/results/ComparisonMatrix'
import { ResultsHeader } from '@/features/results/ResultsHeader'
import { ResultsToolbar } from '@/features/results/ResultsToolbar'
import { ResultsBanner } from '@/features/results/ResultsBanner'
import { RequestJsonDialog } from '@/features/design-form/RequestJsonDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useClipboard } from '@/hooks/useClipboard'
import { loadRequest } from '@/lib/storage'
import { fmtDuration } from '@/lib/format'
import { evaluateAxis, allTargetsMet } from '@/lib/compare'
import { AXES } from '@/config/constants'
import type { ApiError } from '@/api/client'
import type { Candidate, DesignRequest } from '@/api/types'
import type { ViewMode, SortKey } from '@/features/results/ResultsToolbar'
import { Copy, Plus } from 'lucide-react'

export default function JobPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { data: job, isLoading, error, refetch } = useJob(jobId!)
  const isTerminal = job?.status === 'done' || job?.status === 'failed'
  const events = useJobEvents(jobId!, !isTerminal)

  const request = useMemo(() => loadRequest(jobId!), [jobId])

  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [onlyMeeting, setOnlyMeeting] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showJson, setShowJson] = useState(false)
  const { copy } = useClipboard()
  const navigate = useNavigate()

  // Elapsed timer
  useEffect(() => {
    if (isTerminal) return
    const start = Date.now()
    const timer = setInterval(() => setElapsed((Date.now() - start) / 1000), 1000)
    return () => clearInterval(timer)
  }, [isTerminal])

  // Update document title
  useEffect(() => {
    if (job?.status === 'done') {
      document.title = `Results · ${jobId} · Lattice Designer`
    } else {
      document.title = `${job?.status ?? 'Loading'} · ${jobId} · Lattice Designer`
    }
  }, [job?.status, jobId])

  // Merge polled and event progress (monotonic)
  const progress = Math.max(job?.progress ?? 0, events.progress)
  const stage = events.stage ?? job?.stage ?? null
  const message =
    events.messages.length > 0
      ? events.messages[events.messages.length - 1].message
      : (job?.message ?? 'Starting…')

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  // Error
  if (error) {
    const apiErr = error as ApiError
    if (apiErr.code === 'not_found' || apiErr.status === 404) {
      return (
        <ErrorState
          title="We couldn't find this run"
          message={`Job ${jobId} doesn't exist or has expired.`}
          onBack={() => navigate('/')}
        />
      )
    }
    return (
      <ErrorState
        error={apiErr}
        onRetry={() => {
          refetch()
        }}
        onBack={() => navigate('/')}
      />
    )
  }

  if (!job) return null

  // FAILED
  if (job.status === 'failed') {
    return (
      <div className="space-y-6">
        <PageHeader title={`Run ${jobId}`} />
        <ErrorState
          title="Job failed"
          message={job.message}
          onBack={() => navigate('/')}
        ></ErrorState>
        <div className="flex justify-center gap-3">
          <Link to="/">
            <Button variant="secondary" size="sm">
              <Plus className="h-3.5 w-3.5" />
              New design
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // QUEUED / RUNNING
  if (job.status === 'queued' || job.status === 'running') {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title={`Run ${jobId}`}>
          <div className="flex items-center gap-3">
            <span className="text-muted font-mono text-sm tabular-nums">
              {fmtDuration(elapsed)}
            </span>
            <button
              onClick={() => copy(jobId!, 'Job ID copied')}
              className="text-muted hover:text-text cursor-pointer"
              aria-label="Copy job ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </PageHeader>

        <p className="text-muted text-xs">
          This job continues in the background. You can leave and reopen this URL.
        </p>

        <StageStepper currentStage={stage} status={job.status} />

        <ProgressPanel
          progress={job.status === 'queued' ? 0 : progress}
          message={job.status === 'queued' ? 'Waiting in queue' : message}
        />

        {request && <TargetChips request={request} />}

        <ActivityLog messages={events.messages} className="mt-4" />
      </div>
    )
  }

  // DONE — results
  const candidates = job.candidates
  const sortedCandidates = sortCandidates(candidates, sortKey)

  const filteredCandidates =
    onlyMeeting && request
      ? sortedCandidates.filter((c) => candidateMeetsAll(c, request))
      : sortedCandidates

  const allMet = request ? candidates.every((c) => candidateMeetsAll(c, request)) : true

  return (
    <div className="animate-fade-in space-y-6">
      <ResultsHeader
        jobId={jobId!}
        candidateCount={candidates.length}
        candidates={candidates}
        request={request}
        onShowJson={() => setShowJson(true)}
      />

      <ResultsBanner candidateCount={candidates.length} allMet={allMet} />

      {candidates.length === 0 && (
        <EmptyState
          title="No designs came back"
          message="Try relaxing the tolerance, raising the mass limit, or reducing the stiffness target."
        >
          <Link to="/">
            <Button variant="secondary" size="sm">
              Edit target
            </Button>
          </Link>
        </EmptyState>
      )}

      {candidates.length > 0 && (
        <ResultsToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          onlyMeeting={onlyMeeting}
          onOnlyMeetingChange={setOnlyMeeting}
          request={request}
        />
      )}

      {filteredCandidates.length === 0 && onlyMeeting && candidates.length > 0 && (
        <EmptyState
          title="No design meets every target"
          message="Try turning off the filter to see all results."
        >
          <Button variant="ghost" size="sm" onClick={() => setOnlyMeeting(false)}>
            Show all
          </Button>
        </EmptyState>
      )}

      {filteredCandidates.length > 0 && viewMode === 'cards' && (
        <CandidateGrid candidates={filteredCandidates} jobId={jobId!} request={request} />
      )}

      {filteredCandidates.length > 0 && viewMode === 'compare' && (
        <ComparisonMatrix candidates={filteredCandidates} jobId={jobId!} request={request} />
      )}

      {!request && candidates.length > 0 && (
        <p className="text-muted text-center text-xs">
          Target not available for this run (opened in a different browser). Pass/fail markers are
          hidden.
        </p>
      )}

      {request && (
        <RequestJsonDialog open={showJson} onOpenChange={setShowJson} request={request} />
      )}
    </div>
  )
}

function sortCandidates(candidates: Candidate[], key: SortKey): Candidate[] {
  const sorted = [...candidates]
  switch (key) {
    case 'rank':
      return sorted.sort((a, b) => a.rank - b.rank)
    case 'match_error':
      return sorted.sort((a, b) => a.match_error_pct - b.match_error_pct)
    case 'mass':
      return sorted.sort((a, b) => a.mass_g - b.mass_g)
    case 'rel_density':
      return sorted.sort((a, b) => a.rel_density - b.rel_density)
    default:
      return sorted
  }
}

function candidateMeetsAll(candidate: Candidate, request: DesignRequest): boolean {
  const tolerance = request.tolerance_pct
  const results = []

  for (const axis of AXES) {
    const target = request.target.stiffness_gpa[axis]
    results.push(
      evaluateAxis({
        target,
        value: candidate.verified.stiffness_gpa[axis],
        mode: request.modes.stiffness,
        tolerancePct: tolerance,
      }),
    )
  }

  const strengthKey = 'strength_mpa' in request.target ? 'strength_mpa' : 'yield_strength_mpa'
  const strengthTargets = request.target[strengthKey as keyof typeof request.target] as
    Record<string, number | null> | undefined
  for (const axis of AXES) {
    const target = (strengthTargets?.[axis] ?? null) as number | null
    results.push(
      evaluateAxis({
        target,
        value: candidate.verified.strength_mpa[axis],
        mode: request.modes.strength,
        tolerancePct: tolerance,
      }),
    )
  }

  return allTargetsMet(results)
}
