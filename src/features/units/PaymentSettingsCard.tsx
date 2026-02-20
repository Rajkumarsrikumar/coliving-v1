import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { formatDueDate } from '../../lib/utils'
import { EXPENSE_CATEGORIES } from '../../types'

interface PaymentSettingsCardProps {
  unitId: string
  paymentDueDay: number | null
}

interface CategoryPaymentDue {
  id: string
  unit_id: string
  category: string
  due_day: number
  display_order?: number
}

const DUE_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1)
const FIXED_CATEGORIES = EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))

export function PaymentSettingsCard({ unitId, paymentDueDay }: PaymentSettingsCardProps) {
  const queryClient = useQueryClient()
  const [customName, setCustomName] = useState('')
  const [customDueDay, setCustomDueDay] = useState(1)

  const { data: categoryDueList = [] } = useQuery({
    queryKey: ['category-payment-due', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_payment_due')
        .select('*')
        .eq('unit_id', unitId)
        .order('display_order', { ascending: true })
      if (error) throw error
      return (data || []) as CategoryPaymentDue[]
    },
    enabled: !!unitId,
  })

  const generalDueMutation = useMutation({
    mutationFn: async (day: number) => {
      const { error } = await supabase.from('units').update({ payment_due_day: day }).eq('id', unitId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] })
    },
  })

  const upsertCategoryDueMutation = useMutation({
    mutationFn: async ({ category, dueDay }: { category: string; dueDay: number }) => {
      const isFixed = FIXED_CATEGORIES.some((c) => c.value === category)
      const displayOrder = isFixed ? FIXED_CATEGORIES.findIndex((c) => c.value === category) : 50 + customCategories.length
      const { error } = await supabase.from('category_payment_due').upsert(
        { unit_id: unitId, category, due_day: dueDay, display_order: displayOrder },
        { onConflict: 'unit_id,category' }
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-payment-due', unitId] })
    },
  })

  const deleteCategoryDueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('category_payment_due').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-payment-due', unitId] })
    },
  })

  const getDueDayForCategory = (category: string) =>
    categoryDueList.find((c) => c.category === category)?.due_day ?? null

  const customCategories = categoryDueList.filter(
    (c) => !FIXED_CATEGORIES.some((f) => f.value === c.category)
  )

  const handleAddCustom = () => {
    const name = customName.trim()
    if (!name) return
    upsertCategoryDueMutation.mutate(
      { category: name, dueDay: customDueDay },
      {
        onSuccess: () => {
          setCustomName('')
          setCustomDueDay(1)
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Payment settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set when each bill category is due and when co-tenants should pay you.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Per-category bill due dates */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Bill due date by category</Label>
          <p className="text-xs text-muted-foreground">
            Define when each bill is due (day of month). Master tenant pays these to landlord/provider.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FIXED_CATEGORIES.map((cat) => {
              const currentDay = getDueDayForCategory(cat.value)
              return (
                <div key={cat.value} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <span className="min-w-[5rem] text-sm font-medium">{cat.label}:</span>
                  <select
                    value={currentDay ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      const existing = categoryDueList.find((c) => c.category === cat.value)
                      if (v) {
                        upsertCategoryDueMutation.mutate({ category: cat.value, dueDay: parseInt(v, 10) })
                      } else if (existing) {
                        deleteCategoryDueMutation.mutate(existing.id)
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-foreground"
                  >
                    <option value="">Not set</option>
                    {DUE_DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {formatDueDate(d)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          {/* Custom categories */}
          <div className="mt-4 space-y-2 border-t pt-4">
            <Label className="text-sm font-medium">Define your own</Label>
            <p className="text-xs text-muted-foreground">
              Add custom bill categories (e.g. Internet, Electricity) with their due dates.
            </p>
            {customCategories.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-[6rem] text-sm font-medium">{c.category}:</span>
                <span className="text-sm text-muted-foreground">{formatDueDate(c.due_day)}</span>
                <button
                  type="button"
                  onClick={() => deleteCategoryDueMutation.mutate(c.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="e.g. Internet"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="h-9 w-36 text-sm"
              />
              <select
                value={customDueDay}
                onChange={(e) => setCustomDueDay(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-foreground"
              >
                {DUE_DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {formatDueDate(d)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddCustom}
                disabled={!customName.trim() || upsertCategoryDueMutation.isPending}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Co-tenant payment reminder */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-base font-medium">Co-tenant payment reminder</Label>
          <p className="text-xs text-muted-foreground">
            Day by which co-tenants should pay you their share. They will see a reminder.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Due by:</span>
            <select
              value={paymentDueDay ?? ''}
              onChange={(e) => {
                const v = e.target.value
                if (v) generalDueMutation.mutate(parseInt(v, 10))
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-foreground"
            >
              <option value="">Not set</option>
              {DUE_DAY_OPTIONS.slice(0, 28).map((d) => (
                <option key={d} value={d}>
                  {formatDueDate(d)}
                </option>
              ))}
            </select>
            {generalDueMutation.isPending && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
          </div>
          {paymentDueDay && (
            <p className="text-xs text-muted-foreground">
              Co-tenants will be reminded to pay their share before the {formatDueDate(paymentDueDay)}.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
