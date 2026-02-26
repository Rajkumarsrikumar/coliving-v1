import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Moon, Sun } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'

export function MobileHeader() {
  const { signOut } = useAuth()
  const { theme, toggle } = useTheme()
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
    <motion.header
      initial={{ y: -80, opacity: 0, scaleY: 0.9 }}
      animate={{ y: 0, opacity: 1, scaleY: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="fixed inset-x-0 top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card/95 px-4 shadow-sm supports-[backdrop-filter]:bg-card/80 backdrop-blur"
    >
      <Link
        to="/home"
        onClick={handleHomeClick}
        className="flex min-w-0 shrink items-center gap-2 font-display text-base font-bold tracking-tight text-coral-500 transition-colors hover:text-coral-600"
      >
        <img src="/logo-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
        <span>CoTenanty</span>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </motion.header>
  )
}
