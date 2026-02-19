import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Filter, Calendar, Download, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import { getCurrencyForCountry } from '../constants/countries'
import { exportExpensesToExcel } from '../lib/exportUtils'
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../types'
import type { Expense, Profile } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ExpensesPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const now = new Date()
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<number | null>(now.getMonth())
  const [yearFilter, setYearFilter] = useState<number>(now.getFullYear())

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  const { data: unit } = useQuery({
    queryKey: ['unit', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('name, country').eq('id', id!).single()
      if (error) throw error
      return data as { name: string; country?: string | null }
    },
    enabled: !!id,
  })

  const { data: expenses = [], isLoading } = useQuery({
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

  const filtered = expenses.filter((e) => {
    const [y, m] = e.date.split('-').map(Number)
    const matchCategory = !categoryFilter || e.category === categoryFilter
    const matchMonth = monthFilter === null || m === monthFilter + 1
    const matchYear = y === yearFilter
    return matchCategory && matchMonth && matchYear
  })

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  const deleteMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', id] })
      queryClient.invalidateQueries({ queryKey: ['unit', id] })
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const ids = filtered.map((e) => e.id)
      if (ids.length === 0) return
      const { error } = await supabase.from('expenses').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', id] })
      queryClient.invalidateQueries({ queryKey: ['unit', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link to={`/units/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportExpensesToExcel(filtered, unit?.name || 'unit', getCurrencyForCountry(unit?.country))}
            disabled={filtered.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (confirm(`Delete all ${filtered.length} expense${filtered.length === 1 ? '' : 's'}? This cannot be undone.`)) {
                deleteAllMutation.mutate()
              }
            }}
            disabled={filtered.length === 0 || deleteAllMutation.isPending}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete all
          </Button>
          <Link to={`/units/${id}/expenses/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add expense
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4" />
              Month & year
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={monthFilter === null ? '' : monthFilter}
                onChange={(e) => setMonthFilter(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-foreground"
              >
                <option value="">All months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-foreground"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Category</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === null ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setCategoryFilter(null)}
              >
                All
              </Button>
              {EXPENSE_CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={categoryFilter === cat.value ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.value)}
                >
                  <span className={`h-2 w-2 rounded-full ${cat.color}`} />
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          Total for {monthFilter !== null ? `${MONTHS[monthFilter]} ` : ''}{yearFilter}
          {categoryFilter ? ` · ${EXPENSE_CATEGORIES.find((c) => c.value === categoryFilter)?.label || categoryFilter}` : ''}
        </p>
        <p className="text-2xl font-bold">{formatCurrency(total, getCurrencyForCountry(unit?.country))}</p>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center text-muted-foreground"
            >
              No expenses found
            </motion.p>
          ) : (
            filtered.map((exp, i) => {
              const cat = EXPENSE_CATEGORIES.find((c) => c.value === exp.category)
              return (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card>
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={`h-3 w-3 shrink-0 rounded-full ${cat?.color || 'bg-gray-500'}`} />
                        <div className="min-w-0">
                          <p className="font-medium">{cat?.label || exp.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(exp.date)} · {exp.payer?.name || 'Unknown'}
                            {exp.payment_mode && ` · ${PAYMENT_MODES.find((m) => m.value === exp.payment_mode)?.label || exp.payment_mode}`}
                            {exp.notes && ` · ${exp.notes}`}
                          </p>
                        </div>
                      </div>
                      {exp.receipt_url && (
                        <a
                          href={exp.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={exp.receipt_url}
                            alt="Receipt"
                            className="h-12 w-12 rounded-lg border object-cover"
                          />
                        </a>
                      )}
                      <span className="shrink-0 font-semibold">{formatCurrency(exp.amount, getCurrencyForCountry(unit?.country))}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this expense?')) {
                            deleteMutation.mutate(exp.id)
                          }
                        }}
                        className="shrink-0 rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        disabled={deleteMutation.isPending}
                        aria-label="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
