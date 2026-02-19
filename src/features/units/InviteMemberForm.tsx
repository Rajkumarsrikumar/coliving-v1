import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { getCurrencySymbol } from '../../constants/countries'

const shareSchema = z.object({
  email: z.string().email('Enter a valid email'),
  contribution_type: z.literal('share'),
  share_percentage: z.coerce.number().min(0).max(100),
})

const fixedSchema = z.object({
  email: z.string().email('Enter a valid email'),
  contribution_type: z.literal('fixed'),
  fixed_amount: z.coerce.number().min(0),
  contribution_period: z.enum(['monthly', 'yearly']),
  contribution_end_date: z.string().optional().transform((s) => (s && s.trim() ? s : undefined)),
})

type FormData = z.infer<typeof shareSchema> | z.infer<typeof fixedSchema>

type ContributionMode = 'share' | 'fixed'

interface InviteMemberFormProps {
  unitId: string
  currency?: string
}

export function InviteMemberForm({ unitId, currency = 'SGD' }: InviteMemberFormProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<ContributionMode>('share')

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: result, error } = await supabase.rpc('add_member_by_email', {
        p_unit_id: unitId,
        p_email: data.email,
        p_contribution_type: data.contribution_type,
        p_share_percentage: data.contribution_type === 'share' ? data.share_percentage : null,
        p_fixed_amount: data.contribution_type === 'fixed' ? data.fixed_amount : null,
        p_contribution_period: data.contribution_type === 'fixed' ? data.contribution_period : 'monthly',
        p_role: 'co_tenant',
        p_contribution_end_date: data.contribution_type === 'fixed' && data.contribution_end_date ? data.contribution_end_date : null,
      })
      if (error) throw error
      const res = result as { success: boolean; error?: string }
      if (!res?.success && res?.error) {
        throw new Error(res.error)
      }
      if (!res?.success) {
        throw new Error('Failed to add member')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-members', unitId] })
      queryClient.invalidateQueries({ queryKey: ['unit-members-count', unitId] })
    },
  })

  const shareForm = useForm<z.infer<typeof shareSchema>>({
    resolver: zodResolver(shareSchema),
    defaultValues: { contribution_type: 'share', share_percentage: 50 },
  })

  const fixedForm = useForm<z.infer<typeof fixedSchema>>({
    resolver: zodResolver(fixedSchema),
    defaultValues: { contribution_type: 'fixed', fixed_amount: 0, contribution_period: 'monthly', contribution_end_date: '' },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        shareForm.reset({ email: '', contribution_type: 'share', share_percentage: 50 })
        fixedForm.reset({ email: '', contribution_type: 'fixed', fixed_amount: 0, contribution_period: 'monthly', contribution_end_date: '' })
      },
    })
  }

  return (
    <form
      onSubmit={
        mode === 'share'
          ? shareForm.handleSubmit((d) => onSubmit(d))
          : fixedForm.handleSubmit((d) => onSubmit(d))
      }
      className="space-y-4"
    >
      {mutation.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {(mutation.error as Error).message}
        </div>
      )}
      {mutation.isSuccess && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
          Co-tenant added successfully!
        </div>
      )}

      {/* Contribution type toggle */}
      <div className="space-y-2">
        <Label>Contribution type</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('share')}
            className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'share'
                ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
            }`}
          >
            By share %
          </button>
          <button
            type="button"
            onClick={() => setMode('fixed')}
            className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'fixed'
                ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
            }`}
          >
            By fixed amount
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="housemate@example.com"
          {...(mode === 'share' ? shareForm.register('email') : fixedForm.register('email'))}
        />
        <p className="text-xs text-muted-foreground">
          They must have an account. If not, ask them to sign up first.
        </p>
        {(mode === 'share' ? shareForm.formState.errors : fixedForm.formState.errors).email && (
          <p className="text-sm text-red-500">
            {(mode === 'share' ? shareForm.formState.errors : fixedForm.formState.errors).email?.message}
          </p>
        )}
      </div>

      {mode === 'share' ? (
        <div className="space-y-2">
          <Label htmlFor="share_percentage">Contribution share (%)</Label>
          <Input
            id="share_percentage"
            type="number"
            min={0}
            max={100}
            step={1}
            {...shareForm.register('share_percentage')}
          />
          <p className="text-xs text-muted-foreground">
            e.g. 50 for 50/50 split, 33 for 3-way split
          </p>
          {shareForm.formState.errors.share_percentage && (
            <p className="text-sm text-red-500">{shareForm.formState.errors.share_percentage.message}</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="fixed_amount">Fixed amount ({getCurrencySymbol(currency)})</Label>
            <Input
              id="fixed_amount"
              type="number"
              min={0}
              step={0.01}
              placeholder="e.g. 400"
              {...fixedForm.register('fixed_amount')}
            />
          </div>
          <div className="space-y-2">
            <Label>Billing period</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fixedForm.setValue('contribution_period', 'monthly')}
                className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  fixedForm.watch('contribution_period') === 'monthly'
                    ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => fixedForm.setValue('contribution_period', 'yearly')}
                className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  fixedForm.watch('contribution_period') === 'yearly'
                    ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                Yearly
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {fixedForm.watch('contribution_period') === 'yearly'
                ? `Yearly amount (e.g. 4800 = ${getCurrencySymbol(currency)}400/mo)`
                : 'Monthly contribution amount'}
            </p>
            {fixedForm.formState.errors.fixed_amount && (
              <p className="text-sm text-red-500">{fixedForm.formState.errors.fixed_amount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contribution_end_date">End date (optional)</Label>
            <Input
              id="contribution_end_date"
              type="date"
              {...fixedForm.register('contribution_end_date')}
            />
            <p className="text-xs text-muted-foreground">
              When the co-tenant&apos;s contribution ends (e.g. moving out date)
            </p>
          </div>
        </>
      )}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Adding...' : 'Add co-tenant'}
      </Button>
    </form>
  )
}
