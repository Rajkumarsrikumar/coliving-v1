import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'
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
  const [deleteConfirmMonth, setDeleteConfirmMonth] = useState<string | null>(null)
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
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <span>Entries by month ({entries.length})</span>
                {showEntries ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showEntries && (
                <div className="mt-3">
                  {/* Desktop: compact table view for better scanability */}
                  <div className="hidden overflow-x-auto md:block">
                    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-900/95">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <th key={cat.value} className="px-3 py-2.5 text-right font-medium text-muted-foreground">{cat.label}</th>
                            ))}
                            <th className="px-4 py-2.5 text-right font-semibold text-foreground">Total</th>
                            <th className="w-24 px-2 py-2.5" aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(entriesByMonth)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([month, monthEntries]) => {
                              const total = monthEntries.reduce((s, e) => s + e.amount, 0)
                              const isEditing = editingMonth === month
                              const currency = getCurrencyForCountry(unit.country)
                              const monthLabel = new Date(month + '-01').toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
                              const amountByCat = Object.fromEntries(monthEntries.map((e) => [e.category, e.amount]))
                              return (
                                <tr
                                  key={month}
                                  className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${isEditing ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                                >
                                  <td className="px-4 py-2.5 font-medium text-foreground">{monthLabel}</td>
                                  {EXPENSE_CATEGORIES.map((cat) => {
                                    const entry = monthEntries.find((e) => e.category === cat.value)
                                    const amount = amountByCat[cat.value] ?? 0
                                    return (
                                      <td key={cat.value} className="px-2 py-2 text-right">
                                        {isEditing && entry ? (
                                          <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            className="h-8 w-20 text-right text-sm"
                                            value={editingAmounts[entry.id] ?? entry.amount}
                                            onChange={(ev) =>
                                              setEditingAmounts((p) => ({ ...p, [entry.id]: parseFloat(ev.target.value) || 0 }))
                                            }
                                          />
                                        ) : (
                                          <span className="tabular-nums text-muted-foreground">
                                            {formatCurrency(amount, currency)}
                                          </span>
                                        )}
                                      </td>
                                    )
                                  })}
                                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(total, currency)}</td>
                                  <td className="px-2 py-2.5">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          size="sm"
                                          className="h-7 px-2 text-xs"
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
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="h-7 px-2 text-xs"
                                          onClick={() => {
                                            setEditingMonth(null)
                                            setEditingAmounts({})
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingMonth(month)
                                            setEditingAmounts(Object.fromEntries(monthEntries.map((e) => [e.id, e.amount])))
                                          }}
                                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-700"
                                          aria-label="Edit month"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDeleteConfirmMonth(month)}
                                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                          aria-label="Delete month"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Mobile: card layout */}
                  <div className="space-y-3 md:hidden">
                    {Object.entries(entriesByMonth)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([month, monthEntries]) => {
                        const total = monthEntries.reduce((s, e) => s + e.amount, 0)
                        const isEditing = editingMonth === month
                        const currency = getCurrencyForCountry(unit.country)
                        const monthLabel = new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: 'numeric' })
                        return (
                          <div
                            key={month}
                            className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
                              <span className="font-medium text-foreground">{monthLabel}</span>
                              <span className="text-sm font-semibold">{formatCurrency(total, currency)}</span>
                            </div>
                            <div className="p-4">
                              {isEditing ? (
                                <div className="space-y-4">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {monthEntries.map((e) => {
                                      const cat = EXPENSE_CATEGORIES.find((c) => c.value === e.category)
                                      const val = editingAmounts[e.id] ?? e.amount
                                      return (
                                        <div key={e.id} className="flex items-center gap-2">
                                          <Label className="w-24 shrink-0 text-xs text-muted-foreground">
                                            {cat?.label}
                                          </Label>
                                          <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            className="h-9 flex-1 text-sm"
                                            value={val}
                                            onChange={(ev) =>
                                              setEditingAmounts((p) => ({ ...p, [e.id]: parseFloat(ev.target.value) || 0 }))
                                            }
                                          />
                                        </div>
                                      )
                                    })}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
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
                                      {updateEntriesMutation.isPending ? 'Saving...' : 'Save changes'}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        setEditingMonth(null)
                                        setEditingAmounts({})
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                  <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1 text-sm">
                                    {monthEntries
                                      .filter((e) => e.amount > 0)
                                      .map((e) => {
                                        const cat = EXPENSE_CATEGORIES.find((c) => c.value === e.category)
                                        return (
                                          <span key={e.id} className="flex justify-between text-muted-foreground sm:inline">
                                            <span className="font-medium text-foreground">{cat?.label}:</span>{' '}
                                            <span className="tabular-nums sm:inline">{formatCurrency(e.amount, currency)}</span>
                                          </span>
                                        )
                                      })}
                                  </div>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-8 w-full justify-center gap-1.5 px-2.5 text-xs sm:w-auto"
                                      onClick={() => {
                                        setEditingMonth(month)
                                        setEditingAmounts(
                                          Object.fromEntries(monthEntries.map((e) => [e.id, e.amount]))
                                        )
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
                                    </Button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmMonth(month)}
                                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 sm:w-auto dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                      aria-label="Delete month"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {deleteConfirmMonth && (
        <ConfirmDialog
          open={!!deleteConfirmMonth}
          title="Delete month entries"
          message={`Delete all entries for ${new Date(deleteConfirmMonth + '-01').toLocaleDateString('en', { month: 'short', year: 'numeric' })}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteMonthMutation.mutate(deleteConfirmMonth, {
              onSuccess: () => setDeleteConfirmMonth(null),
            })
          }}
          onCancel={() => setDeleteConfirmMonth(null)}
          isLoading={deleteMonthMutation.isPending}
        />
      )}
    </motion.div>
  )
}
