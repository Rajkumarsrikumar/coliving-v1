import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Users, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/Card'
import { EmptyState } from '../components/layout/EmptyState'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import { getCurrencyForCountry } from '../constants/countries'
import type { Unit } from '../types'

export function HomePage() {
  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Unit[]
    },
  })

  const { data: memberCounts } = useQuery({
    queryKey: ['unit-members-count', units.map((u) => u.id)],
    queryFn: async () => {
      const counts: Record<string, number> = {}
      for (const u of units) {
        const { count } = await supabase
          .from('unit_members')
          .select('*', { count: 'exact', head: true })
          .eq('unit_id', u.id)
        counts[u.id] = count ?? 0
      }
      return counts
    },
    enabled: units.length > 0,
  })

  const { data: masterTenants } = useQuery({
    queryKey: ['unit-master-tenants', units.map((u) => u.id)],
    queryFn: async () => {
      const map: Record<string, string> = {}
      for (const u of units) {
        const { data: members } = await supabase
          .from('unit_members')
          .select('user_id')
          .eq('unit_id', u.id)
          .in('role', ['master_tenant', 'owner'])
          .limit(1)
        const userId = members?.[0]?.user_id
        if (userId) {
          const { data: profile } = await supabase.from('profiles').select('name').eq('id', userId).single()
          map[u.id] = profile?.name || 'Unknown'
        }
      }
      return map
    },
    enabled: units.length > 0,
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
      </div>
    )
  }

  if (units.length === 0) {
    return (
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <EmptyState
          icon={Users}
          title="No units yet"
          description="Create your first coliving unit to start tracking expenses and splitting costs with your housemates."
          actionLabel="Create unit"
          onAction={() => (window.location.href = '/units/new')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Your units</h2>
        <Link to="/units/new">
          <Button>
            <Plus className="h-4 w-4" />
            Create unit
          </Button>
        </Link>
      </div>
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
          hidden: {},
        }}
      >
        {units.map((unit) => (
          <motion.div key={unit.id} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <Link to={`/units/${unit.id}`}>
              <Card className="cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg">
                <div className="relative h-32 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {unit.image_url ? (
                    <img
                      src={unit.image_url}
                      alt={unit.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Home className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-1 font-semibold">{unit.name}</h3>
                  {masterTenants?.[unit.id] && (
                    <p className="mb-1 text-xs text-muted-foreground">Master tenant: {masterTenants[unit.id]}</p>
                  )}
                  {unit.address && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-1">{unit.address}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {memberCounts?.[unit.id] ?? 0} members
                    </span>
                    <span className="font-medium text-coral-500">{formatCurrency(unit.monthly_rent, getCurrencyForCountry(unit.country))}/mo</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
