import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { getCurrencySymbol } from '../../constants/countries'
import { PAYMENT_MODES } from '../../types'
import type { PaymentMode } from '../../types'
import type { UnitMember, Profile } from '../../types'

interface RecordSharePaymentModalProps {
  unitId: string
  userId: string
  suggestedAmount?: number
  masterTenants: (UnitMember & { profile?: Profile })[]
  isMasterTenant?: boolean
  currency?: string
  onClose: () => void
  onSuccess: () => void
}

export function RecordSharePaymentModal({
  unitId,
  userId,
  suggestedAmount = 0,
  masterTenants,
  isMasterTenant = false,
  currency = 'SGD',
  onClose,
  onSuccess,
}: RecordSharePaymentModalProps) {
  const otherMasterTenants = masterTenants.filter((m) => m.user_id !== userId)
  const [amount, setAmount] = useState(String(suggestedAmount > 0 ? suggestedAmount : ''))
  const [payTo, setPayTo] = useState<string | 'direct'>(
    isMasterTenant ? 'direct' : (otherMasterTenants.length > 0 ? otherMasterTenants[0].user_id : 'direct')
  )
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    setIsSubmitting(true)

    try {
      const now = new Date()
      const forMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const { error: insertErr } = await supabase.from('balance_payments').insert({
        unit_id: unitId,
        from_user_id: userId,
        to_user_id: isMasterTenant ? null : (payTo === 'direct' ? null : payTo),
        amount: amt,
        for_month: forMonth,
        payment_mode: paymentMode,
        notes: notes.trim() || null,
      })
      if (insertErr) throw insertErr
      onSuccess()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-[calc(100vw-2rem)] rounded-2xl bg-card p-4 shadow-xl sm:max-w-md sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Record amount paid</h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 rounded-full p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({getCurrencySymbol(currency)})</Label>
            <Input
              id="amount"
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={suggestedAmount > 0 ? String(suggestedAmount) : '0.00'}
            />
            {suggestedAmount > 0 && (
              <p className="text-xs text-muted-foreground">Your share this month: {suggestedAmount.toFixed(2)}</p>
            )}
          </div>

          {!isMasterTenant && (
            <div className="space-y-2">
              <Label htmlFor="pay_to">Paid to</Label>
              <select
                id="pay_to"
                value={payTo}
                onChange={(e) => setPayTo(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-800 dark:bg-slate-950 dark:text-foreground"
              >
                <option value="direct">Direct (e.g. landlord, utilities)</option>
                {otherMasterTenants.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.name || 'Master tenant'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment_mode">Payment mode</Label>
            <select
              id="payment_mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-800 dark:bg-slate-950 dark:text-foreground"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rent for Jan"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Record payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
