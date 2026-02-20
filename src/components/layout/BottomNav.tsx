import { Link, useLocation } from 'react-router-dom'
import { motion, LayoutGroup } from 'framer-motion'
import { Home, Wallet, User } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/spends', icon: Wallet, label: 'Spends' },
  { to: '/profile', icon: User, label: 'Profile' },
] as const

export function BottomNav() {
  const location = useLocation()
  const queryClient = useQueryClient()

  const activeIndex = navItems.findIndex(({ to }) => {
    if (to === '/home') return location.pathname === '/home' || location.pathname.startsWith('/units')
    return location.pathname.startsWith(to)
  })
  const cutoutX = activeIndex >= 0 ? ((activeIndex + 0.5) / navItems.length) * 100 : 50

  const handleHomeClick = () => {
    queryClient.invalidateQueries({ queryKey: ['units'] })
    if (location.pathname === '/home') {
      queryClient.invalidateQueries({ queryKey: ['unit-members-count'] })
      queryClient.invalidateQueries({ queryKey: ['unit-master-tenants'] })
    }
  }

  return (
    <LayoutGroup>
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="fixed inset-x-0 bottom-0 z-40 flex w-full"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="relative flex h-14 w-full items-end justify-around overflow-visible rounded-t-[1.25rem] pb-1.5 pt-1.5">
        <div
          className="pointer-events-none absolute inset-0 rounded-t-[1.25rem] bg-card/95 shadow-lg supports-[backdrop-filter]:bg-card/80 backdrop-blur"
          style={{
            WebkitMaskImage: `radial-gradient(circle 36px at ${cutoutX}% 0, transparent 36px, white 37px)`,
            maskImage: `radial-gradient(circle 36px at ${cutoutX}% 0, transparent 36px, white 37px)`,
          }}
          aria-hidden
        />
        {navItems.map(({ to, icon: Icon, label }, i) => {
          const isActive =
            to === '/home'
              ? location.pathname === '/home' || location.pathname.startsWith('/units')
              : location.pathname.startsWith(to)
          return (
            <Link key={to} to={to} onClick={to === '/home' ? handleHomeClick : undefined} className="relative flex flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: isActive ? -10 : 6,
                  scale: 1,
                }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 22 }}
                whileTap={{ scale: 0.9, transition: { duration: 0.1 } }}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors',
                  isActive
                    ? 'text-white'
                    : 'text-slate-500/80 dark:text-slate-500 hover:text-slate-400 dark:hover:text-slate-400'
                )}
              >
                <div className="relative flex flex-col items-center justify-center gap-0.5 px-5 py-2">
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-0 z-0 rounded-full bg-coral-500 shadow-lg ring-2 ring-white/10 dark:ring-white/5"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <motion.div
                    className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center"
                    animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <Icon className="h-6 w-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} stroke="currentColor" />
                  </motion.div>
                  <motion.span
                    animate={isActive ? { fontWeight: 600 } : { fontWeight: 500 }}
                    className="relative z-10 text-[10px] font-medium"
                  >
                    {label}
                  </motion.span>
                </div>
              </motion.div>
            </Link>
          )
        })}
      </nav>
    </motion.div>
    </LayoutGroup>
  )
}
