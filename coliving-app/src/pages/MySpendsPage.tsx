import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Wallet, Home, ArrowLeft, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency, getExpectedAmount } from '../lib/utils'
import { getCurrencyForCountry } from '../constants/countries'
import type { Unit, Expense, UnitMember } from '../types'

export function MySpendsPage() {
  const { user } = useAuth()

  const { data: memberships = [], isLoading: membersLoading } = useQuery({
    queryKey: ['my-units', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_members')
        .select('*')
        .eq('user_id', user!.id)
      if (error) throw error
      return (data || []) as UnitMember[]
    },
    enabled: !!user?.id,
  })

  const unitIds = memberships.map((m) => m.unit_id)

  const { data: unitsMap = {}, isLoading: unitsLoading } = useQuery({
    queryKey: ['units-for-spends', unitIds],
    queryFn: async () => {
      if (unitIds.length === 0) return {}
      const { data, error } = await supabase.from('units').select('*').in('id', unitIds)
      if (error) throw error
      return Object.fromEntries(((data || []) as Unit[]).map((u) => [u.id, u]))
    },
    enabled: unitIds.length > 0,
  })

  const { data: expensesByUnit = {}, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses-for-spends', unitIds],
    queryFn: async () => {
      const result: Record<string, Expense[]> = {}
      for (const unitId of unitIds) {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('unit_id', unitId)
          .order('date', { ascending: false })
        if (error) throw error
        result[unitId] = (data || []) as Expense[]
      }
      return result
    },
    enabled: unitIds.length > 0,
  })

  const { data: membersByUnit = {}, isLoading: membersByUnitLoading } = useQuery({
    queryKey: ['members-for-spends', unitIds],
    queryFn: async () => {
      const result: Record<string, UnitMember[]> = {}
      for (const unitId of unitIds) {
        const { data, error } = await supabase
          .from('unit_members')
          .select('*')
          .eq('unit_id', unitId)
        if (error) throw error
        result[unitId] = (data || []) as UnitMember[]
      }
      return result
    },
    enabled: unitIds.length > 0,
  })

  const isLoading = membersLoading || unitsLoading || expensesLoading || membersByUnitLoading

  const summary = memberships
    .filter((m) => unitsMap[m.unit_id])
    .map((m) => {
    const unit = unitsMap[m.unit_id]!
    const expenses = expensesByUnit[m.unit_id] || []
    const members = membersByUnit[m.unit_id] || []
    const monthlyRent = unit?.monthly_rent ?? 0

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const myOwed = getExpectedAmount(m, members, totalExpenses, monthlyRent)
    const myPaid = expenses.filter((e) => e.paid_by === user?.id).reduce((s, e) => s + e.amount, 0)
    const balance = myPaid - myOwed

    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
    const thisMonthExpenses = expenses.filter((e) => e.date >= thisMonthStart)
    const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)
    const thisMonthOwed = getExpectedAmount(m, members, thisMonthTotal, monthlyRent)
    const thisMonthPaid = thisMonthExpenses.filter((e) => e.paid_by === user?.id).reduce((s, e) => s + e.amount, 0)

    return {
      unit,
      totalExpenses,
      myOwed,
      myPaid,
      balance,
      thisMonthOwed,
      thisMonthPaid,
    }
  })

  const totalPaid = summary.reduce((s, x) => s + x.myPaid, 0)
  const totalOwed = summary.reduce((s, x) => s + x.myOwed, 0)
  const totalBalance = totalPaid - totalOwed
  const thisMonthPaid = summary.reduce((s, x) => s + x.thisMonthPaid, 0)
  const thisMonthOwed = summary.reduce((s, x) => s + x.thisMonthOwed, 0)
  const primaryCurrency = summary.length > 0 ? getCurrencyForCountry(summary[0].unit.country) : 'SGD'
  const hasMultipleCurrencies = summary.length > 1 && new Set(summary.map((s) => getCurrencyForCountry(s.unit.country))).size > 1

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <Link to="/home" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to units
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Wallet className="h-7 w-7 text-coral-500" />
          My overall spends
        </h1>
        <p className="mt-1 hidden text-muted-foreground sm:block">Your spending across all CoTenanty units</p>
      </div>

      {memberships.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No units yet. Create or join a unit to track your spends.</p>
            <Link to="/home">
              <span className="mt-2 inline-block text-sm font-medium text-coral-500 hover:underline">Go to units</span>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden bg-gradient-to-br from-coral-500 to-coral-600 text-white">
              <CardContent className="p-4 sm:p-6">
                <p className="text-sm opacity-90">Total you&apos;ve paid (all time)</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(totalPaid, primaryCurrency)}</p>
                <div className="mt-3 text-sm opacity-90 sm:mt-2">
                  <div className="flex flex-col gap-0.5 sm:block">
                    <span>Share {formatCurrency(totalOwed, primaryCurrency)}</span>
                    <span className="hidden sm:inline"> · </span>
                    <span>
                      Balance {formatCurrency(totalBalance, primaryCurrency)}
                      {(totalBalance > 0 || totalBalance < 0) && (
                        <> {totalBalance > 0 ? '(you\'re owed)' : '(you owe)'}</>
                      )}
                    </span>
                  </div>
                </div>
                {hasMultipleCurrencies && (
                  <p className="mt-2 text-xs opacity-75 sm:mt-1">Aggregate uses {primaryCurrency}. Per-unit amounts use each unit&apos;s currency.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  This month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground sm:text-sm">Paid</p>
                    <p className="text-base font-semibold tabular-nums sm:text-lg">{formatCurrency(thisMonthPaid, primaryCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground sm:text-sm">Share</p>
                    <p className="text-base font-semibold tabular-nums sm:text-lg">{formatCurrency(thisMonthOwed, primaryCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground sm:text-sm">Balance</p>
                    <p className={`text-base font-semibold tabular-nums sm:text-lg ${thisMonthPaid - thisMonthOwed >= 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {formatCurrency(thisMonthPaid - thisMonthOwed, primaryCurrency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-coral-500" />
                  By unit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {summary.map((s) => {
                    const currency = getCurrencyForCountry(s.unit.country)
                    return (
                      <Link key={s.unit.id} to={`/units/${s.unit.id}`}>
                        <div className="flex min-h-[88px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100/80 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 sm:min-h-0 md:min-h-[80px]">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-foreground sm:text-sm md:text-base">{s.unit.name}</p>
                            {/* Mobile: stacked | Tablet: inline | Desktop: inline */}
                            <div className="mt-2 flex flex-col gap-1 text-sm sm:mt-1.5 md:flex-row md:flex-wrap md:gap-x-3 md:gap-y-0">
                              <span className="text-muted-foreground">
                                Paid {formatCurrency(s.myPaid, currency)}
                              </span>
                              <span className="text-muted-foreground">
                                Share {formatCurrency(s.myOwed, currency)}
                              </span>
                              {s.balance !== 0 && (
                                <span className={`font-semibold ${s.balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {s.balance > 0 ? 'Owed' : 'Owe'} {formatCurrency(Math.abs(s.balance), currency)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="flex h-10 min-w-[40px] shrink-0 items-center justify-center text-lg text-coral-500 md:min-w-[32px]">
                            →
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
