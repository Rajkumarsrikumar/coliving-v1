import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { PAYMENT_MODES } from '../../types'
import type { PaymentMode } from '../../types'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

interface MarkPaymentModalProps {
  contributionId: string
  amount: number
  userId: string
  currency?: string
  onClose: () => void
  onSuccess: () => void
}

export function MarkPaymentModal({ contributionId, amount, userId, currency = 'SGD', onClose, onSuccess }: MarkPaymentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setUploadError('Please upload a valid image (JPEG, PNG, WebP, or GIF)')
        return
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadError(`Image must be under ${MAX_SIZE_MB}MB`)
        return
      }
      setUploadError(null)
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      let receiptUrl: string | null = null

      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop() || 'jpg'
        const path = `contribution-payments/${contributionId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })
        if (uploadErr) throw new Error(uploadErr.message)
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
        receiptUrl = urlData.publicUrl
      }

      const { error: insertErr } = await supabase.from('contribution_payments').insert({
        contribution_id: contributionId,
        user_id: userId,
        amount,
        payment_mode: paymentMode,
        receipt_url: receiptUrl,
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
          <h2 className="text-lg font-semibold">Mark as paid</h2>
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
            <Label>Amount</Label>
            <p className="text-lg font-medium">{new Intl.NumberFormat('en-SG', { style: 'currency', currency }).format(amount)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_mode">Payment mode</Label>
            <select
              id="payment_mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-800 dark:bg-slate-950"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Receipt / proof (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
            {!selectedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-coral-700 dark:hover:bg-coral-950/20"
              >
                <ImagePlus className="h-5 w-5" />
                Upload receipt or proof
              </button>
            ) : (
              <div className="relative">
                <img src={previewUrl!} alt="Receipt" className="h-28 w-full rounded-lg border object-cover" />
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1.5 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Mark as paid'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
