import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from './components/ThemeProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { CreateUnitPage } from './pages/CreateUnitPage'
import { UnitDashboardPage } from './pages/UnitDashboardPage'
import { AddExpensePage } from './pages/AddExpensePage'
import { ExpensesPage } from './pages/ExpensesPage'
import { ContributionsPage } from './pages/ContributionsPage'
import { AddContributionPage } from './pages/AddContributionPage'
import { UnitMembersPage } from './pages/UnitMembersPage'
import { ProfilePage } from './pages/ProfilePage'
import { MySpendsPage } from './pages/MySpendsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
})

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

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
      <Header />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl flex-1 xl:max-w-7xl">
          <AnimatePresence mode="wait">
            {children}
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
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1"
                >
                  <HomePage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/new"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <CreateUnitPage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <UnitDashboardPage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/expenses"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <ExpensesPage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/expenses/new"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <AddExpensePage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/spends"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <MySpendsPage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <ProfilePage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/members"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <UnitMembersPage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/contributions"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <ContributionsPage />
                </motion.div>
              </ProtectedLayout>
            }
          />
          <Route
            path="/units/:id/contributions/new"
            element={
              <ProtectedLayout>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <AddContributionPage />
                </motion.div>
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
