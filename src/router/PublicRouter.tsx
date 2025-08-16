import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RootPublicLayout } from '../layouts/RootPublicLayout'
import { PageSkeleton } from '../components/ui/Skeleton'
import { ErrorPage } from '../pages/ErrorPage'
import { LoginForm } from '../components/LoginForm'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('../pages/HomePage').then(module => ({ default: module.HomePage })))
const VacancyDetailPage = lazy(() => import('../pages/VacancyDetailPage').then(module => ({ default: module.VacancyDetailPage })))
const ApplicationPage = lazy(() => import('../pages/ApplicationPage').then(module => ({ default: module.ApplicationPage })))
const StatusPage = lazy(() => import('../pages/StatusPage').then(module => ({ default: module.StatusPage })))
const SuccessPage = lazy(() => import('../pages/SuccessPage').then(module => ({ default: module.SuccessPage })))
const AfterDocsPage = lazy(() => import('../pages/AfterDocsPage').then(module => ({ default: module.AfterDocsPage })))

// Wrapper component for Suspense
function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  )
}

export const publicRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootPublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <HomePage />
          </SuspenseWrapper>
        )
      },
      {
        path: 'vacantes/:id',
        element: (
          <SuspenseWrapper>
            <VacancyDetailPage />
          </SuspenseWrapper>
        )
      },
      {
        path: 'vacantes/:id/aplicar',
        element: (
          <SuspenseWrapper>
            <ApplicationPage />
          </SuspenseWrapper>
        )
      },
      {
        path: 'estatus',
        element: (
          <SuspenseWrapper>
            <StatusPage />
          </SuspenseWrapper>
        )
      },
      {
        path: 'estatus/:folio',
        element: (
          <SuspenseWrapper>
            <StatusPage />
          </SuspenseWrapper>
        )
      },
      {
        path: 'success/:folio',
        element: (
          <SuspenseWrapper>
            <SuccessPage />
          </SuspenseWrapper>
        )
      },
      {
        path: 'after-docs/:folio',
        element: (
          <SuspenseWrapper>
            <AfterDocsPage />
          </SuspenseWrapper>
        )
      },
      {
        path: 'login',
        element: (
          <SuspenseWrapper>
            <LoginForm />
          </SuspenseWrapper>
        )
      },
      {
        path: '*',
        element: <ErrorPage />
      }
    ]
  }
])