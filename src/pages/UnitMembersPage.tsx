import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, UserPlus, Crown, Bell, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { InviteMemberForm } from '../features/units/InviteMemberForm'
import { EditMemberModal } from '../features/units/EditMemberModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, formatDueDate, formatMemberContribution, getNextDueDate } from '../lib/utils'
import { getCurrencyForCountry } from '../constants/countries'
import type { UnitMember, Profile } from '../types'

export function UnitMembersPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const { data: unit } = useQuery({
    queryKey: ['unit', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['unit-members', id],
    queryFn: async () => {
      const { data: membersData, error } = await supabase
        .from('unit_members')
        .select('*')
        .eq('unit_id', id!)
      if (error) throw error
      const userIds = [...new Set(membersData?.map((m) => m.user_id) || [])]
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
      return (membersData || []).map((m) => ({
        ...m,
        profile: profileMap[m.user_id],
      })) as (UnitMember & { profile?: Profile })[]
    },
    enabled: !!id,
  })

  const currentUserMember = members.find((m) => m.user_id === user?.id)
  const isMasterTenant = currentUserMember?.role === 'master_tenant' || currentUserMember?.role === 'owner'
  const [editingMember, setEditingMember] = useState<(UnitMember & { profile?: Profile }) | null>(null)

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <Link to={`/units/${id}`} className="mb-4 text-sm text-muted-foreground hover:text-foreground">
        ← Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{unit?.name} – Members</h1>
        <p className="hidden text-muted-foreground sm:block">Master tenant adds co-tenants. Set share % or fixed amount (monthly/yearly).</p>
      </div>

      {/* Payment reminder (co-tenants only) */}
      {!isMasterTenant && unit?.payment_due_day && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <Bell className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">Payment reminder</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Send your share before the {formatDueDate(unit.payment_due_day)}. Next due: {formatDate(getNextDueDate(unit.payment_due_day))}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current members */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 sm:rounded-lg sm:p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-100 font-medium text-coral-600 dark:bg-coral-900/30">
                      {(member.profile?.name || '?')[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">
                          {member.profile?.name || 'Unknown'}
                          {member.user_id === user?.id && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        {isMasterTenant && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 shrink-0 p-0 sm:h-8 sm:w-8"
                            onClick={() => setEditingMember(member)}
                            aria-label="Edit contribution"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-muted-foreground sm:mt-1 sm:flex-row sm:flex-wrap sm:gap-x-2 sm:gap-y-0">
                        <span className="flex items-center gap-1">
                          {(member.role === 'master_tenant' || member.role === 'owner') && <Crown className="h-3.5 w-3.5 shrink-0" />}
                          {member.role === 'master_tenant' || member.role === 'owner' ? 'Master tenant' : 'Co-tenant'}
                        </span>
                        <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">·</span>
                        <span className="tabular-nums">
                          <span className="sm:hidden">{formatMemberContribution(member, getCurrencyForCountry(unit?.country), { short: true })}</span>
                          <span className="hidden sm:inline">{formatMemberContribution(member, getCurrencyForCountry(unit?.country))}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Add member (owners only) */}
        {isMasterTenant && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add co-tenant
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add by email. Set share % or fixed amount (monthly/yearly).
                </p>
              </CardHeader>
              <CardContent>
                <InviteMemberForm unitId={id!} currency={getCurrencyForCountry(unit?.country)} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {!isMasterTenant && (
        <p className="mt-4 text-sm text-muted-foreground">
          Only the master tenant can add co-tenants.
        </p>
      )}

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          unitId={id!}
          currency={getCurrencyForCountry(unit?.country)}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  )
}
