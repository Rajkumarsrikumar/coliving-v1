import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, Calendar, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { getCurrencySymbol } from '../../constants/countries'
import type { UnitMember, Profile } from '../../types'
import type { ContributionType, ContributionPeriod } from '../../types'

interface EditMemberModalProps {
  member: UnitMember & { profile?: Profile }
  unitId: string
  currency?: string
  onClose: () => void
}

export function EditMemberModal({ member, unitId, currency = 'SGD', onClose }: EditMemberModalProps) {
  const queryClient = useQueryClient()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [contributionType, setContributionType] = useState<ContributionType>(
    (member.contribution_type as ContributionType) || 'share'
  )
  const [sharePercentage, setSharePercentage] = useState(String(member.share_percentage ?? 100))
  const [fixedAmount, setFixedAmount] = useState(String(member.fixed_amount ?? 0))
  const [contributionPeriod, setContributionPeriod] = useState<ContributionPeriod>(
    (member.contribution_period as ContributionPeriod) || 'monthly'
  )
  const [contributionEndDate, setContributionEndDate] = useState(member.contribution_end_date || '')

  const mutation = useMutation({
    mutationFn: async () => {
      const share = contributionType === 'share' ? parseFloat(sharePercentage) || 0 : null
      const fixed = contributionType === 'fixed' ? parseFloat(fixedAmount) || 0 : null

      if (contributionType === 'share') {
        if (share !== null && (share < 0 || share > 100)) {
          throw new Error('Share must be between 0 and 100')
        }
      } else {
        if (fixed !== null && fixed < 0) {
          throw new Error('Fixed amount must be 0 or more')
        }
      }

      const { error } = await supabase
        .from('unit_members')
        .update({
          contribution_type: contributionType,
          share_percentage: contributionType === 'share' ? share : null,
          fixed_amount: contributionType === 'fixed' ? fixed : null,
          contribution_period: contributionType === 'fixed' ? contributionPeriod : null,
          contribution_end_date: contributionType === 'fixed' && contributionEndDate.trim() ? contributionEndDate.trim() : null,
        })
        .eq('id', member.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-members', unitId] })
      queryClient.invalidateQueries({ queryKey: ['unit-members-count', unitId] })
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  const isMasterTenant = member.role === 'master_tenant' || member.role === 'owner'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-[calc(100vw-2rem)] flex-col overflow-visible rounded-2xl bg-card shadow-xl sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Edit contribution</h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 rounded-full p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          {member.profile?.name || 'Unknown'}
          {isMasterTenant && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Crown className="h-3.5 w-3.5" /> Master tenant
            </span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mutation.error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {(mutation.error as Error).message}
            </div>
          )}

          <div className="space-y-2">
            <Label>Contribution type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContributionType('share')}
                className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  contributionType === 'share'
                    ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                By share %
              </button>
              <button
                type="button"
                onClick={() => setContributionType('fixed')}
                className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  contributionType === 'fixed'
                    ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                By fixed amount
              </button>
            </div>
          </div>

          {contributionType === 'share' ? (
            <div className="space-y-2">
              <Label htmlFor="share_percentage">Contribution share (%)</Label>
              <Input
                id="share_percentage"
                type="number"
                min={0}
                max={100}
                step={1}
                value={sharePercentage}
                onChange={(e) => setSharePercentage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                e.g. 100 for sole tenant, 50 for 50/50 split
              </p>
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
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="e.g. 400"
                />
              </div>
              <div className="space-y-2">
                <Label>Billing period</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setContributionPeriod('monthly')}
                    className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      contributionPeriod === 'monthly'
                        ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setContributionPeriod('yearly')}
                    className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      contributionPeriod === 'yearly'
                        ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {contributionPeriod === 'yearly'
                    ? `Yearly amount (e.g. 4800 = ${getCurrencySymbol(currency)}400/mo)`
                    : 'Monthly contribution amount'}
                </p>
              </div>
              <div className="space-y-2 overflow-visible">
                <Label htmlFor="contribution_end_date">End date (optional)</Label>
                <div className="relative flex overflow-visible">
                  <Input
                    ref={dateInputRef}
                    id="contribution_end_date"
                    type="date"
                    value={contributionEndDate}
                    onChange={(e) => setContributionEndDate(e.target.value)}
                    className="flex-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => dateInputRef.current?.showPicker?.()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                    aria-label="Open date picker"
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  When this member&apos;s contribution ends (e.g. moving out date)
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
