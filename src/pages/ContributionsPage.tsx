import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, HandCoins, Check, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency, formatDate } from '../lib/utils'
import { getCurrencyForCountry } from '../constants/countries'
import { exportContributionsToExcel } from '../lib/exportUtils'
import { MarkPaymentModal } from '../features/contributions/MarkPaymentModal'
import { PAYMENT_MODES } from '../types'
import type { Contribution, ContributionPayment, Profile } from '../types'

export function ContributionsPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: unit } = useQuery({
    queryKey: ['unit', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('name, country').eq('id', id!).single()
      if (error) throw error
      return data as { name: string; country?: string | null }
    },
    enabled: !!id,
  })

  const { data: memberCount = 1 } = useQuery({
    queryKey: ['unit-members-count', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('unit_members')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', id!)
      if (error) throw error
      return count ?? 1
    },
    enabled: !!id,
  })

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ['contributions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('unit_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      const contribIds = (data || []).map((c) => c.id)
      const { data: payments } = await supabase
        .from('contribution_payments')
        .select('*')
        .in('contribution_id', contribIds)
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', [
        ...new Set([
          ...(data || []).map((c) => c.requested_by),
          ...(payments || []).map((p) => p.user_id),
        ]),
      ])
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
      return (data || []).map((c) => ({
        ...c,
        requester: profileMap[c.requested_by],
        payments: (payments || []).filter((p) => p.contribution_id === c.id).map((p) => ({
          ...p,
          profile: profileMap[p.user_id],
        })),
      })) as (Contribution & { requester?: Profile; payments?: (ContributionPayment & { profile?: Profile })[] })[]
    },
    enabled: !!id,
  })

  const [paymentModal, setPaymentModal] = useState<{ contributionId: string; amount: number } | null>(null)

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      {paymentModal && user && (
        <MarkPaymentModal
          contributionId={paymentModal.contributionId}
          amount={paymentModal.amount}
          userId={user.id}
          currency={getCurrencyForCountry(unit?.country)}
          onClose={() => setPaymentModal(null)}
          onSuccess={() => {
            setPaymentModal(null)
            queryClient.invalidateQueries({ queryKey: ['contributions', id] })
          }}
        />
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link to={`/units/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportContributionsToExcel(contributions, unit?.name || 'unit', getCurrencyForCountry(unit?.country))}
            disabled={contributions.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Link to={`/units/${id}/contributions/new`}>
            <Button>
              <Plus className="h-4 w-4" />
              Request contribution
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            Additional contributions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            One-time requests for repairs, extra cleaning, or other shared costs.
          </p>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {contributions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HandCoins className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No contribution requests yet</p>
              <Link to={`/units/${id}/contributions/new`}>
                <Button className="mt-4">Request your first contribution</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          contributions.map((c) => {
            const membersCount = memberCount
            const paidCount = c.payments?.length ?? 0
            const progress = membersCount > 0 ? (paidCount / membersCount) * 100 : 0
            const userPaid = c.payments?.some((p) => p.user_id === user?.id)

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{c.reason}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(c.amount, getCurrencyForCountry(unit?.country))} · {c.requester?.name || 'Unknown'} · {formatDate(c.created_at)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          c.status === 'collected'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}
                      >
                        {c.status === 'collected' ? 'Collected' : 'Pending'}
                      </span>
                    </div>
                    {c.payments && c.payments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Amount sent by co-tenants</p>
                        {c.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                            <span>
                              <span className="font-medium">{p.profile?.name || 'Unknown'}</span>
                              <span className="text-muted-foreground">
                                {' '}· {formatCurrency(p.amount, getCurrencyForCountry(unit?.country))}
                                {p.payment_mode && ` · ${PAYMENT_MODES.find((m) => m.value === p.payment_mode)?.label || p.payment_mode}`}
                                {' '}· {formatDate(p.paid_at)}
                              </span>
                            </span>
                            {p.receipt_url && (
                              <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-coral-600 hover:underline dark:text-coral-400">
                                Receipt
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{paidCount} paid</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full bg-coral-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                    {!userPaid && c.status !== 'collected' && (
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() =>
                          setPaymentModal({
                            contributionId: c.id,
                            amount: c.amount / membersCount,
                          })
                        }
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Mark as paid
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
