import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/utils'
import { getCurrencyForCountry } from '../../constants/countries'
import { EXPENSE_CATEGORIES } from '../../types'
import type { Unit, ExpectedExpense, ExpectedExpenseEntry } from '../../types'

interface ExpectedExpensesCardProps {
  unit: Unit
}

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

export function ExpectedExpensesCard({ unit }: ExpectedExpensesCardProps) {
  const queryClient = useQueryClient()
  const [showEntries, setShowEntries] = useState(false)

  const { data: expectedExpenses = [] } = useQuery({
    queryKey: ['expected-expenses', unit.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expected_expenses')
        .select('*')
        .eq('unit_id', unit.id)
      if (error) throw error
      return data as ExpectedExpense[]
    },
    enabled: !!unit.id,
  })

  const { data: entries = [] } = useQuery({
    queryKey: ['expected-expense-entries', unit.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expected_expense_entries')
        .select('*')
        .eq('unit_id', unit.id)
        .order('month', { ascending: true })
      if (error) throw error
      return data as ExpectedExpenseEntry[]
    },
    enabled: !!unit.id,
  })

  const saveMutation = useMutation({
    mutationFn: async (updates: { category: string; amount: number }[]) => {
      for (const { category, amount } of updates) {
        const existing = expectedExpenses.find((e) => e.category === category)
        if (existing) {
          await supabase.from('expected_expenses').update({ amount }).eq('id', existing.id)
        } else {
          await supabase.from('expected_expenses').insert({ unit_id: unit.id, category, amount })
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expected-expenses', unit.id] })
    },
  })

  const updateEntriesMutation = useMutation({
    mutationFn: async (updates: { id: string; amount: number }[]) => {
      for (const { id, amount } of updates) {
        const { error } = await supabase.from('expected_expense_entries').update({ amount }).eq('id', id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expected-expense-entries', unit.id] })
    },
  })

  const deleteMonthMutation = useMutation({
    mutationFn: async (month: string) => {
      const monthStart = month.slice(0, 7) + '-01'
      const { error } = await supabase
        .from('expected_expense_entries')
        .delete()
        .eq('unit_id', unit.id)
        .eq('month', monthStart)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expected-expense-entries', unit.id] })
    },
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const start = unit.contact_start_date
      const end = unit.contact_expiry_date
      if (!start || !end) {
        throw new Error('Set contract start and expiry dates in Edit unit first')
      }
      const months = getMonthsInRange(start!, end!)
      const template = Object.fromEntries(
        expectedExpenses.map((e) => [e.category, e.amount])
      ) as Record<string, number>

      // Use monthly_rent for rent if not in template
      if (!template.rent && unit.monthly_rent) {
        template.rent = unit.monthly_rent
      }

      const toInsert: { unit_id: string; month: string; category: string; amount: number }[] = []
      for (const month of months) {
        for (const cat of ['rent', 'pub', 'cleaning', 'provisions', 'other']) {
          const amount = template[cat] ?? 0
          toInsert.push({ unit_id: unit.id, month, category: cat, amount })
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('expected_expense_entries').upsert(toInsert, {
          onConflict: 'unit_id,month,category',
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expected-expense-entries', unit.id] })
      setShowEntries(true)
    },
  })

  const [editing, setEditing] = useState<Record<string, string>>({})
  const [editingMonth, setEditingMonth] = useState<string | null>(null)
  const [editingAmounts, setEditingAmounts] = useState<Record<string, number>>({})
  const handleSaveTemplate = () => {
    const updates = EXPENSE_CATEGORIES.map((c) => ({
      category: c.value,
      amount: parseFloat(editing[c.value] ?? String(expectedExpenses.find((e) => e.category === c.value)?.amount ?? 0)) || 0,
    }))
    saveMutation.mutate(updates)
    setEditing({})
  }

  const templateMap = Object.fromEntries(expectedExpenses.map((e) => [e.category, e.amount]))
  const entriesByMonth = entries.reduce<Record<string, ExpectedExpenseEntry[]>>((acc, e) => {
    const m = e.month.slice(0, 7)
    if (!acc[m]) acc[m] = []
    acc[m].push(e)
    return acc
  }, {})

  const hasContractPeriod = unit.contact_start_date && unit.contact_expiry_date

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4">
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Expected expenses
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Set expected amounts per category. Generate entries for each month in the contract period.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pb-4 pt-0">
          {!hasContractPeriod && (
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Set contract start and expiry dates in Edit unit to generate expected entries.
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Monthly expected amounts ({getCurrencyForCountry(unit.country)})</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <div key={cat.value} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-muted-foreground">{cat.label}</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editing[cat.value] ?? String(templateMap[cat.value] ?? (cat.value === 'rent' ? unit.monthly_rent : 0))}
                    onChange={(e) => setEditing((p) => ({ ...p, [cat.value]: e.target.value }))}
                    placeholder="0"
                    className="h-8 flex-1 text-sm"
                  />
                </div>
              ))}
            </div>
            {(Object.keys(editing).length > 0 || expectedExpenses.length === 0) && (
              <Button size="sm" onClick={handleSaveTemplate} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save expected amounts'}
              </Button>
            )}
          </div>

          {hasContractPeriod && (
            <div>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {generateMutation.isPending ? 'Generating...' : 'Create entries for contract period'}
              </Button>
              {generateMutation.error && (
                <p className="mt-1 text-xs text-red-500">{(generateMutation.error as Error).message}</p>
              )}
            </div>
          )}

          {entries.length > 0 && (
            <div className="border-t pt-3">
              <button
                type="button"
                onClick={() => setShowEntries(!showEntries)}
                className="flex w-full items-center justify-between text-left text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Entries by month ({entries.length})
                {showEntries ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showEntries && (
                <div className="mt-2 space-y-1">
                  {Object.entries(entriesByMonth)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, monthEntries]) => {
                      const total = monthEntries.reduce((s, e) => s + e.amount, 0)
                      const isEditing = editingMonth === month
                      const currency = getCurrencyForCountry(unit.country)
                      return (
                        <div key={month} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
                          <span className="w-20 shrink-0 text-muted-foreground">{formatDate(month + '-01')}</span>
                          {isEditing ? (
                            <>
                              <div className="flex flex-1 flex-wrap gap-x-2 gap-y-1">
                                {monthEntries.map((e) => {
                                  const cat = EXPENSE_CATEGORIES.find((c) => c.value === e.category)
                                  const val = editingAmounts[e.id] ?? e.amount
                                  return (
                                    <div key={e.id} className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">{cat?.label}:</span>
                                      <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        className="h-7 w-20 px-1.5 text-xs"
                                        value={val}
                                        onChange={(ev) =>
                                          setEditingAmounts((p) => ({ ...p, [e.id]: parseFloat(ev.target.value) || 0 }))
                                        }
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                              <Button
                                size="sm"
                                className="h-7 shrink-0 px-2 text-xs"
                                onClick={() => {
                                  const updates = monthEntries
                                    .map((e) => ({ id: e.id, amount: editingAmounts[e.id] ?? e.amount }))
                                    .filter((u) => u.amount >= 0)
                                  updateEntriesMutation.mutate(updates, {
                                    onSuccess: () => {
                                      setEditingMonth(null)
                                      setEditingAmounts({})
                                    },
                                  })
                                }}
                                disabled={updateEntriesMutation.isPending}
                              >
                                Save
                              </Button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMonth(null)
                                  setEditingAmounts({})
                                }}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex flex-1 flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                                {monthEntries
                                  .filter((e) => e.amount > 0)
                                  .map((e) => {
                                    const cat = EXPENSE_CATEGORIES.find((c) => c.value === e.category)
                                    return (
                                      <span key={e.id}>
                                        {cat?.label}: {formatCurrency(e.amount, currency)}
                                      </span>
                                    )
                                  })}
                              </div>
                              <span className="w-16 shrink-0 text-right font-medium">{formatCurrency(total, currency)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMonth(month)
                                  setEditingAmounts(
                                    Object.fromEntries(monthEntries.map((e) => [e.id, e.amount]))
                                  )
                                }}
                                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                                aria-label="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete all entries for ${formatDate(month + '-01')}?`)) {
                                    deleteMonthMutation.mutate(month)
                                  }
                                }}
                                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
