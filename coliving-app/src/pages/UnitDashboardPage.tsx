import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, DollarSign, TrendingUp, Users, HandCoins, Bell, Pencil, Phone, Mail, FileText, Calendar, FileDown, Wallet, Receipt, Trash2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency, formatDate, formatMemberContribution, formatDueDate, getExpectedAmount, getNextDueDate } from '../lib/utils'
import { getCurrencyForCountry, getCurrencySymbol } from '../constants/countries'
import { PaymentSettingsCard } from '../features/units/PaymentSettingsCard'
import { EditUnitModal } from '../features/units/EditUnitModal'
import { ExportReportModal } from '../features/units/ExportReportModal'
import { ExpectedExpensesCard } from '../features/expected-expenses/ExpectedExpensesCard'
import { RecordSharePaymentModal } from '../features/balance-payments/RecordSharePaymentModal'
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../types'
import type { Unit, Expense, UnitMember, Profile, ExpectedExpenseEntry } from '../types'

export function UnitDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: unit, isLoading: unitLoading } = useQuery({
    queryKey: ['unit', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*').eq('id', id).single()
      if (error) throw error
      return data as Unit
    },
    enabled: !!id,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['unit-members', id],
    queryFn: async () => {
      const { data: membersData, error } = await supabase
        .from('unit_members')
        .select('*')
        .eq('unit_id', id)
      if (error) throw error
      const userIds = [...new Set(membersData?.map((m) => m.user_id) || [])]
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
      return (membersData || []).map((m) => ({ ...m, profile: profileMap[m.user_id] })) as (UnitMember & { profile?: Profile })[]
    },
    enabled: !!id,
  })

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('unit_id', id!)
        .order('date', { ascending: false })
      if (error) throw error
      const userIds = [...new Set((data || []).map((e) => e.paid_by))]
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
      return (data || []).map((e) => ({ ...e, payer: profileMap[e.paid_by] })) as (Expense & { payer?: Profile })[]
    },
    enabled: !!id,
  })

  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: balancePayments = [] } = useQuery({
    queryKey: ['balance-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balance_payments')
        .select('*')
        .eq('unit_id', id!)
      if (error) throw error
      return (data || []) as { id: string; from_user_id: string; to_user_id: string | null; amount: number; for_month: string; payment_mode: string | null; notes: string | null; paid_at: string | null }[]
    },
    enabled: !!id,
  })

  const thisMonthBalancePayments = balancePayments.filter((p) => p.for_month?.startsWith(thisMonthKey.slice(0, 7)))

  const { data: expectedEntries = [] } = useQuery({
    queryKey: ['expected-expense-entries', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expected_expense_entries')
        .select('*')
        .eq('unit_id', id!)
        .order('month', { ascending: true })
      if (error) throw error
      return (data || []) as ExpectedExpenseEntry[]
    },
    enabled: !!id,
  })

  const thisMonthExpenses = expenses.filter((e) => e.date >= thisMonthStart)
  const lastMonthExpenses = expenses.filter((e) => e.date >= lastMonthStart && e.date < thisMonthStart)

  const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const trend = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentYear = now.getFullYear()

  function getMonthsInRange(startDate: string, endDate: string): string[] {
    const months: string[] = []
    const s = new Date(startDate)
    const e = new Date(endDate)
    const curr = new Date(s.getFullYear(), s.getMonth(), 1)
    const end = new Date(e.getFullYear(), e.getMonth(), 1)
    while (curr <= end) {
      months.push(curr.toISOString().slice(0, 7) + '-01')
      curr.setMonth(curr.getMonth() + 1)
    }
    return months
  }

  const contractMonths = unit?.contact_start_date && unit?.contact_expiry_date
    ? getMonthsInRange(unit.contact_start_date, unit.contact_expiry_date)
    : []

  const entriesByMonth = expectedEntries.reduce<Record<string, ExpectedExpenseEntry[]>>((acc, e) => {
    const m = e.month.slice(0, 7)
    if (!acc[m]) acc[m] = []
    acc[m].push(e)
    return acc
  }, {})

  const useExpectedEntries = contractMonths.length > 0 && expectedEntries.length > 0

  const thisMonthExpectedTotal = (entriesByMonth[thisMonthKey.slice(0, 7)] || []).reduce((s, e) => s + e.amount, 0)
  const totalFromContributions = members.reduce((s, m) => s + getExpectedAmount(m, members, unit?.monthly_rent ?? 0, unit?.monthly_rent ?? 0), 0)
  const totalForExpected = useExpectedEntries && thisMonthExpectedTotal > 0 ? thisMonthExpectedTotal : (totalFromContributions > 0 ? totalFromContributions : thisMonthTotal)

  const stackedByMonth = (() => {
    if (useExpectedEntries) {
      return contractMonths.map((monthKey) => {
        const d = new Date(monthKey)
        const monthStart = monthKey
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
        const monthLabel = d.getFullYear() !== currentYear ? `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` : MONTHS[d.getMonth()]
        const entries = entriesByMonth[monthKey.slice(0, 7)] || []
        const monthExpenses = expenses.filter((e) => e.date >= monthStart && e.date <= monthEnd)
        return {
          month: monthLabel,
          rent: entries.filter((e) => e.category === 'rent').reduce((s, e) => s + e.amount, 0),
          pub: entries.filter((e) => e.category === 'pub').reduce((s, e) => s + e.amount, 0),
          cleaning: entries.filter((e) => e.category === 'cleaning').reduce((s, e) => s + e.amount, 0),
          provisions: entries.filter((e) => e.category === 'provisions').reduce((s, e) => s + e.amount, 0),
          other: entries.filter((e) => e.category === 'other').reduce((s, e) => s + e.amount, 0),
          actualRent: monthExpenses.filter((e) => e.category === 'rent').reduce((s, e) => s + e.amount, 0),
          actualPub: monthExpenses.filter((e) => e.category === 'pub').reduce((s, e) => s + e.amount, 0),
          actualCleaning: monthExpenses.filter((e) => e.category === 'cleaning').reduce((s, e) => s + e.amount, 0),
          actualProvisions: monthExpenses.filter((e) => e.category === 'provisions').reduce((s, e) => s + e.amount, 0),
          actualOther: monthExpenses.filter((e) => e.category === 'other').reduce((s, e) => s + e.amount, 0),
        }
      })
    }
    const months: { month: string; rent: number; pub: number; cleaning: number; provisions: number; other: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = d.toISOString().slice(0, 10)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      const monthExpenses = expenses.filter((e) => e.date >= monthStart && e.date <= monthEnd)
      const monthLabel = d.getFullYear() !== currentYear ? `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` : MONTHS[d.getMonth()]
      months.push({
        month: monthLabel,
        rent: monthExpenses.filter((e) => e.category === 'rent').reduce((s, e) => s + e.amount, 0),
        pub: monthExpenses.filter((e) => e.category === 'pub').reduce((s, e) => s + e.amount, 0),
        cleaning: monthExpenses.filter((e) => e.category === 'cleaning').reduce((s, e) => s + e.amount, 0),
        provisions: monthExpenses.filter((e) => e.category === 'provisions').reduce((s, e) => s + e.amount, 0),
        other: monthExpenses.filter((e) => e.category === 'other').reduce((s, e) => s + e.amount, 0),
      })
    }
    return months
  })()

  const monthOnMonthChartData = stackedByMonth.map((m) => {
    const row = m as { month: string; rent: number; pub: number; cleaning: number; provisions: number; other: number; actualRent?: number; actualPub?: number; actualCleaning?: number; actualProvisions?: number; actualOther?: number }
    return {
      month: row.month,
      rent: (row.actualRent ?? row.rent) ?? 0,
      pub: (row.actualPub ?? row.pub) ?? 0,
      cleaning: (row.actualCleaning ?? row.cleaning) ?? 0,
      provisions: (row.actualProvisions ?? row.provisions) ?? 0,
      other: (row.actualOther ?? row.other) ?? 0,
    }
  })

  const currentUserMember = members.find((m) => m.user_id === user?.id)
  const isMasterTenant = currentUserMember?.role === 'master_tenant' || currentUserMember?.role === 'owner'
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [deletePaymentConfirmId, setDeletePaymentConfirmId] = useState<string | null>(null)

  const balances = members.map((m) => {
    const expected = getExpectedAmount(m, members, totalForExpected, unit?.monthly_rent ?? 0)
    const paidFromExpenses = thisMonthExpenses.filter((e) => e.paid_by === m.user_id).reduce((s, e) => s + e.amount, 0)
    const paidFromBalancePayments = thisMonthBalancePayments
      .filter((p) => p.from_user_id === m.user_id)
      .reduce((s, p) => s + p.amount, 0)
    const paid = paidFromExpenses + paidFromBalancePayments
    const balance = paid - expected
    return { member: m, expected, paid, balance }
  })

  const balancePaymentsThisMonthTotal = thisMonthBalancePayments.reduce((s, p) => s + p.amount, 0)
  const masterTenantsContribution = members
    .filter((m) => m.role === 'master_tenant' || m.role === 'owner')
    .reduce((s, m) => s + getExpectedAmount(m, members, totalForExpected, unit?.monthly_rent ?? 0), 0)
  const amountReceived = balancePaymentsThisMonthTotal + masterTenantsContribution

  if (unitLoading || !unit) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
      </div>
    )
  }

  const currency = getCurrencyForCountry(unit.country)

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      {showEditModal && (
        <EditUnitModal
          unit={unit}
          masterTenantMember={isMasterTenant ? currentUserMember : null}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showRecordPaymentModal && user && currentUserMember && (
        <RecordSharePaymentModal
          unitId={id!}
          userId={user.id}
          suggestedAmount={(() => {
            const b = balances.find((x) => x.member.user_id === user.id)
            return b && b.balance < 0 ? Math.abs(b.balance) : 0
          })()}
          masterTenants={members.filter((m) => m.role === 'master_tenant' || m.role === 'owner')}
          isMasterTenant={isMasterTenant}
          currency={currency}
          onClose={() => setShowRecordPaymentModal(false)}
          onSuccess={() => {
            setShowRecordPaymentModal(false)
            queryClient.invalidateQueries({ queryKey: ['balance-payments', id] })
          }}
        />
      )}
      {showExportModal && unit && (
        <ExportReportModal
          unit={unit}
          members={members}
          expenses={expenses}
          onClose={() => setShowExportModal(false)}
        />
      )}
      <div className="mb-6">
        <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to units
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="min-w-0 flex-1 text-xl font-bold text-foreground sm:text-2xl">{unit.name}</h1>
          {isMasterTenant && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              <Pencil className="h-4 w-4" />
              Edit unit
            </Button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to={`/units/${id}/members`}>
            <Button variant="secondary" size="sm">
              <Users className="h-4 w-4" />
              Members
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setShowExportModal(true)}>
            <FileDown className="h-4 w-4" />
            Export report
          </Button>
          <Link to={`/units/${id}/expenses/new`}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Payment reminder banner - hidden once user has recorded payment for this month */}
      {unit?.payment_due_day && !isMasterTenant && !thisMonthBalancePayments.some((p) => p.from_user_id === user?.id) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Payment reminder
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Please send your share before the {formatDueDate(unit.payment_due_day)}. Next due: {formatDate(getNextDueDate(unit.payment_due_day))}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowRecordPaymentModal(true)}>
            <Wallet className="mr-2 h-4 w-4" />
            Record payment
          </Button>
        </motion.div>
      )}

      {/* My Wallet - shows paid contribution for all members */}
      {currentUserMember && (() => {
        const myBalance = balances.find((b) => b.member.user_id === user?.id)
        if (!myBalance) return null
        const paidFromRecorded = thisMonthBalancePayments.filter((p) => p.from_user_id === user?.id).reduce((s, p) => s + p.amount, 0)
        const walletBalance = amountReceived - thisMonthTotal
        return (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="overflow-hidden border-2 border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="h-5 w-5 text-coral-500" />
                    My wallet
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">Your paid contribution this month</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{formatCurrency(myBalance.paid, currency)}</span>
                  <span className={`text-sm font-medium ${walletBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    Balance: {walletBalance >= 0 ? '+' : ''}{formatCurrency(walletBalance, currency)}
                  </span>
                </div>
                <div className="space-y-1.5 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount received in master account</span>
                    <span>{formatCurrency(amountReceived, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expenses paid (actuals paid)</span>
                    <span>{formatCurrency(thisMonthTotal, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total amount paid (Myself)</span>
                    <span>{formatCurrency(paidFromRecorded, currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })()}

      {/* My payments - list of recorded payments */}
      {currentUserMember && (() => {
        const myPayments = balancePayments
          .filter((p) => p.from_user_id === user?.id)
          .sort((a, b) => {
            const monthCompare = (b.for_month || '').localeCompare(a.for_month || '')
            if (monthCompare !== 0) return monthCompare
            return (b.paid_at || '').localeCompare(a.paid_at || '')
          })
        if (myPayments.length === 0) return null
        const formatMonth = (d: string) => new Date(d).toLocaleDateString('en', { month: 'short', year: 'numeric' })
        return (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5 text-coral-500" />
                  My payments
                </CardTitle>
                <p className="text-sm text-muted-foreground">Your recorded payments</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {myPayments.map((p) => {
                    const paidTo = p.to_user_id
                      ? (members.find((m) => m.user_id === p.to_user_id)?.profile?.name || 'Master tenant')
                      : 'Direct'
                    return (
                      <div
                        key={p.id}
                        className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{formatCurrency(p.amount, currency)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMonth(p.for_month)}
                            {p.paid_at && ` · Recorded ${formatDate(p.paid_at)}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>To: {paidTo}</span>
                          {p.payment_mode && (
                            <span>{PAYMENT_MODES.find((m) => m.value === p.payment_mode)?.label || p.payment_mode}</span>
                          )}
                          {p.notes && <span className="w-full sm:w-auto">— {p.notes}</span>}
                          {isMasterTenant && (
                            <button
                              type="button"
                              onClick={() => setDeletePaymentConfirmId(p.id)}
                              disabled={deletingPaymentId === p.id}
                              className="ml-auto rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/50"
                              aria-label="Delete payment"
                            >
                              {deletingPaymentId === p.id ? (
                                <span className="text-xs">Deleting...</span>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })()}

      {deletePaymentConfirmId && (
        <ConfirmDialog
          open={!!deletePaymentConfirmId}
          title="Delete payment"
          message="Delete this payment record? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={async () => {
            if (!deletePaymentConfirmId) return
            setDeletingPaymentId(deletePaymentConfirmId)
            try {
              const { error } = await supabase.from('balance_payments').delete().eq('id', deletePaymentConfirmId)
              if (error) throw error
              queryClient.invalidateQueries({ queryKey: ['balance-payments', id] })
              setDeletePaymentConfirmId(null)
            } catch (err) {
              console.error('Delete payment failed:', err)
              alert((err as Error).message || 'Failed to delete payment')
            } finally {
              setDeletingPaymentId(null)
            }
          }}
          onCancel={() => setDeletePaymentConfirmId(null)}
          isLoading={deletingPaymentId === deletePaymentConfirmId}
        />
      )}

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="overflow-hidden bg-gradient-to-br from-coral-500 to-coral-600 text-white">
          <CardContent className="p-6 sm:p-8">
            <p className="mb-1 text-sm opacity-90">This month</p>
            <p className="text-4xl font-bold">{formatCurrency(thisMonthTotal, currency)}</p>
            <div className="mt-2 flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${trend >= 0 ? 'rotate-0' : 'rotate-180'}`} />
              <span className="text-sm">
                {trend >= 0 ? '+' : ''}
                {trend.toFixed(0)}% vs last month
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Month-on-month expenses chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-4">
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Month-on-month expenses ({getCurrencySymbol(currency)})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Expenses by category per month
            </p>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {monthOnMonthChartData.some((m) => (m.rent + m.pub + m.cleaning + m.provisions + m.other) > 0) ? (
              <div className="h-48 min-h-[160px] min-w-0 w-full overflow-x-auto text-card-foreground">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={monthOnMonthChartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.3} vertical={false} />
                    <XAxis dataKey="month" fontSize={10} tick={{ fill: 'currentColor' }} stroke="currentColor" />
                    <YAxis tickFormatter={(v) => (typeof v === 'number' ? v.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : v)} fontSize={10} tick={{ fill: 'currentColor' }} stroke="currentColor" domain={[0, 'auto']} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, currency)} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} itemStyle={{ fontSize: '11px' }} labelStyle={{ fontSize: '11px' }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="rent" stackId="expenses" fill={EXPENSE_CATEGORIES.find((c) => c.value === 'rent')?.chartColor || '#3b82f6'} name="Rent" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pub" stackId="expenses" fill={EXPENSE_CATEGORIES.find((c) => c.value === 'pub')?.chartColor || '#22c55e'} name="PUB" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="cleaning" stackId="expenses" fill={EXPENSE_CATEGORIES.find((c) => c.value === 'cleaning')?.chartColor || '#f59e0b'} name="Cleaning" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="provisions" stackId="expenses" fill={EXPENSE_CATEGORIES.find((c) => c.value === 'provisions')?.chartColor || '#a855f7'} name="Provisions" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="other" stackId="expenses" fill={EXPENSE_CATEGORIES.find((c) => c.value === 'other')?.chartColor || '#6b7280'} name="Other" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No expenses yet. Add expenses to see the chart.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Balances */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Balances
              </CardTitle>
              <p className="text-sm text-muted-foreground">Expected amount, paid, and balance per member</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">Member</th>
                      <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Expected</th>
                      <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Paid</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map(({ member, expected, paid, balance }) => (
                      <tr key={member.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-100 font-medium text-coral-600 dark:bg-coral-900/30">
                              {(member.profile?.name || '?')[0]}
                            </div>
                            <div>
                              <p className="font-medium">{member.profile?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{formatMemberContribution(member)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-foreground">
                          {formatCurrency(expected, currency)}
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-foreground">
                          {formatCurrency(paid, currency)}
                        </td>
                        <td
                          className={`py-3 text-right font-semibold ${
                            balance > 0 ? 'text-green-600 dark:text-green-400' : balance < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                          }`}
                        >
                          {balance > 0 ? '+' : ''}
                          {formatCurrency(balance, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expenses */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5" />
                  Expenses
                </CardTitle>
                <p className="text-sm text-muted-foreground">This month: {formatCurrency(thisMonthTotal, currency)}</p>
              </div>
              <div className="flex gap-1">
                <Link to={`/units/${id}/expenses/new`}>
                  <Button size="sm">Add</Button>
                </Link>
                <Link to={`/units/${id}/expenses`}>
                  <Button variant="secondary" size="sm">View all</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {thisMonthExpenses.length > 0 ? (
                <div className="space-y-2">
                  {thisMonthExpenses.slice(0, 4).map((exp) => {
                    const cat = EXPENSE_CATEGORIES.find((c) => c.value === exp.category)
                    return (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${cat?.color || 'bg-gray-500'}`} />
                          <span className="truncate">{cat?.label || exp.category}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(exp.date)}</span>
                        </div>
                        <span className="shrink-0 font-medium">{formatCurrency(exp.amount, currency)}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <p>No expenses this month</p>
                  <Link to={`/units/${id}/expenses/new`}>
                    <Button size="sm" variant="secondary" className="mt-2">Add expense</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Agent & lease info */}
      {(unit?.agent_name || unit?.agent_email || unit?.agent_phone || unit?.contact_expiry_date || unit?.contract_url) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Agent & lease
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {unit.contact_expiry_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Contract expires: {formatDate(unit.contact_expiry_date)}</span>
                </div>
              )}
              {unit.agent_name && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{unit.agent_name}</span>
                </div>
              )}
              {unit.agent_email && (
                <a href={`mailto:${unit.agent_email}`} className="flex items-center gap-2 text-sm text-coral-600 hover:underline dark:text-coral-400">
                  <Mail className="h-4 w-4" />
                  {unit.agent_email}
                </a>
              )}
              {unit.agent_phone && (
                <a href={`tel:${unit.agent_phone}`} className="flex items-center gap-2 text-sm text-coral-600 hover:underline dark:text-coral-400">
                  <Phone className="h-4 w-4" />
                  {unit.agent_phone}
                </a>
              )}
              {unit.contract_url && (
                <a href={unit.contract_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-coral-600 hover:underline dark:text-coral-400">
                  <FileText className="h-4 w-4" />
                  View contract document
                </a>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Payment settings (master tenant only) */}
      {isMasterTenant && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-6">
          <PaymentSettingsCard unitId={id!} paymentDueDay={unit?.payment_due_day ?? null} />
        </motion.div>
      )}

      {/* Expected expenses (master tenant only) */}
      {isMasterTenant && unit && (
        <ExpectedExpensesCard unit={unit} />
      )}

      {/* Recent expenses */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent expenses</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Link to={`/units/${id}/members`}>
                <Button variant="ghost" size="sm">Members</Button>
              </Link>
              <Link to={`/units/${id}/expenses`}>
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
              <Link to={`/units/${id}/contributions`}>
                <Button variant="ghost" size="sm">Contributions</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {expenses.slice(0, 5).length > 0 ? (
              <div className="space-y-2">
                {expenses.slice(0, 5).map((exp) => {
                  const cat = EXPENSE_CATEGORIES.find((c) => c.value === exp.category)
                  return (
                    <div
                      key={exp.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={`h-2 w-2 shrink-0 rounded-full ${cat?.color || 'bg-gray-500'}`} />
                        <div className="min-w-0">
                          <p className="font-medium">{cat?.label || exp.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(exp.date)} · {exp.payer?.name || 'Unknown'}
                            {exp.payment_mode && ` · ${PAYMENT_MODES.find((m) => m.value === exp.payment_mode)?.label || exp.payment_mode}`}
                          </p>
                        </div>
                      </div>
                      {exp.receipt_url && (
                        <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img src={exp.receipt_url} alt="Receipt" className="h-10 w-10 rounded border object-cover" />
                        </a>
                      )}
                      <span className="shrink-0 font-medium">{formatCurrency(exp.amount, currency)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <HandCoins className="mx-auto mb-2 h-10 w-10 opacity-50" />
                <p>No expenses yet</p>
                <Link to={`/units/${id}/expenses/new`}>
                  <Button size="sm" className="mt-2">Add your first expense</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
