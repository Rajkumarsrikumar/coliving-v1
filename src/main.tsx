import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'

const App = lazy(() => import('./App.tsx'))

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div
              style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                color: '#64748b',
                fontFamily: 'system-ui',
              }}
            >
              Loading CoTenanty...
            </div>
          }
        >
          <App />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>,
  )
}
