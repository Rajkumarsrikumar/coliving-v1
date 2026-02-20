import { Link, useLocation } from 'react-router-dom'
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

  const handleHomeClick = () => {
    queryClient.invalidateQueries({ queryKey: ['units'] })
    if (location.pathname === '/home') {
      queryClient.invalidateQueries({ queryKey: ['unit-members-count'] })
      queryClient.invalidateQueries({ queryKey: ['unit-master-tenants'] })
    }
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {navItems.map(({ to, icon: Icon, label }) => {
        const isActive =
          to === '/home'
            ? location.pathname === '/home'
            : location.pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            onClick={to === '/home' ? handleHomeClick : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
              isActive
                ? 'text-coral-500'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-6 w-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
