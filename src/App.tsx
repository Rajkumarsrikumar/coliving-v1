import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from './components/ThemeProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { MobileHeader } from './components/layout/MobileHeader'
import { BottomNav } from './components/layout/BottomNav'
import { LoginPage } from './pages/LoginPage'

// Lazy load pages for code splitting - reduces initial bundle by ~350 KiB
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const CreateUnitPage = lazy(() => import('./pages/CreateUnitPage').then(m => ({ default: m.CreateUnitPage })))
const UnitDashboardPage = lazy(() => import('./pages/UnitDashboardPage').then(m => ({ default: m.UnitDashboardPage })))
const AddExpensePage = lazy(() => import('./pages/AddExpensePage').then(m => ({ default: m.AddExpensePage })))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })))
const ContributionsPage = lazy(() => import('./pages/ContributionsPage').then(m => ({ default: m.ContributionsPage })))
const AddContributionPage = lazy(() => import('./pages/AddContributionPage').then(m => ({ default: m.AddContributionPage })))
const UnitMembersPage = lazy(() => import('./pages/UnitMembersPage').then(m => ({ default: m.UnitMembersPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const AboutUsPage = lazy(() => import('./pages/AboutUsPage').then(m => ({ default: m.AboutUsPage })))
const MySpendsPage = lazy(() => import('./pages/MySpendsPage').then(m => ({ default: m.MySpendsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
})

const pageTransition = {
  initial: { opacity: 0, y: 50, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.98 },
  transition: { type: 'spring' as const, stiffness: 350, damping: 26 },
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
            style={{ borderColor: '#f55d4a', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <motion.div {...pageTransition} className="flex-1">
        {children}
      </motion.div>
    </Suspense>
  )
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
            style={{ borderColor: '#f55d4a', borderTopColor: 'transparent' }}
          />
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Desktop: fixed top header - hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <Header />
      </div>
      {/* Mobile/tablet: top bar with logo + bottom nav - hidden on desktop */}
      <div className="lg:hidden">
        <MobileHeader />
        <BottomNav />
      </div>
      <main className="flex flex-1 flex-col pb-16 pt-14 lg:pb-0 lg:pt-14">
        <div className="mx-auto w-full max-w-6xl flex-1 xl:max-w-7xl">
          <AnimatePresence mode="wait">
            {React.isValidElement(children)
              ? React.cloneElement(children, { key: location.pathname } as { key: string })
              : children}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/forgot-password"
            element={
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-100"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" style={{ borderColor: '#f55d4a', borderTopColor: 'transparent' }} /></div>}>
                <ForgotPasswordPage />
              </Suspense>
            }
          />
          <Route
            path="/reset-password"
            element={
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-100"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" style={{ borderColor: '#f55d4a', borderTopColor: 'transparent' }} /></div>}>
                <ResetPasswordPage />
              </Suspense>
            }
          />
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <HomePage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/new"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <CreateUnitPage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <UnitDashboardPage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/expenses"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <ExpensesPage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/expenses/new"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <AddExpensePage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/spends"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <MySpendsPage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <ProfilePage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <AboutUsPage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/members"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <UnitMembersPage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/contributions"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <ContributionsPage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/contributions/new"
            element={
              <ProtectedLayout>
                <PageFrame>
                  <AddContributionPage />
                </PageFrame>
              </ProtectedLayout>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
