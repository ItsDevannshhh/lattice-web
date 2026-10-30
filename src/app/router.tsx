import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'

const DesignPage = lazy(() => import('@/pages/DesignPage'))
const JobPage = lazy(() => import('@/pages/JobPage'))
const DetailPage = lazy(() => import('@/pages/DetailPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <DesignPage />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: '/job/:jobId',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <JobPage />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: '/job/:jobId/design/:designId',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <DetailPage />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: '*',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <NotFoundPage />
            </Suspense>
          </ErrorBoundary>
        ),
      },
    ],
  },
])
