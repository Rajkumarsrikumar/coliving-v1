import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, LogOut, User, Wallet, Info } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/utils'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const { profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const queryClient = useQueryClient()

  const handleCotenantyClick = () => {
    queryClient.invalidateQueries({ queryKey: ['units'] })
    if (location.pathname === '/home') {
      queryClient.invalidateQueries({ queryKey: ['unit-members-count'] })
      queryClient.invalidateQueries({ queryKey: ['unit-master-tenants'] })
    }
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card/95 px-4 shadow-sm supports-[backdrop-filter]:bg-card/80 sm:px-6 lg:backdrop-blur',
        className
      )}
    >
      <Link
        to="/home"
        onClick={handleCotenantyClick}
        className="flex min-w-0 shrink items-center gap-2 font-display text-lg font-bold tracking-tight text-coral-500 transition-colors hover:text-coral-600"
      >
        <img src="/logo-icon.png" alt="" className="h-7 w-7 object-contain" width={28} height={28} />
        CoTenanty
      </Link>
      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
        <Link
          to="/spends"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
          title="My overall spends"
        >
          <Wallet className="h-5 w-5" />
          <span className="hidden sm:inline">Spends</span>
        </Link>
        <Link
          to="/about"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
          title="About"
        >
          <Info className="h-5 w-5" />
          <span className="hidden sm:inline">About</span>
        </Link>
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
              width={28}
              height={28}
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-100 text-coral-600 dark:bg-coral-900/30 dark:text-coral-400">
              <User className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="hidden sm:inline">{profile?.name || 'Profile'}</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
