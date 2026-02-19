import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { getCurrencyForCountry, getCurrencySymbol } from '../../constants/countries'
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../types'
import type { ExpenseCategory, PaymentMode } from '../../types'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

const schema = z.object({
  category: z.enum(['rent', 'pub', 'cleaning', 'provisions', 'other']),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  paid_by: z.string().min(1, 'Select who paid'),
  payment_mode: z.enum(['bank_transfer', 'paynow', 'cash', 'grabpay', 'paylah', 'credit_card', 'other']).optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddExpenseFormProps {
  unitId: string
}

export function AddExpenseForm({ unitId }: AddExpenseFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: unit } = useQuery({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('name, country').eq('id', unitId).single()
      if (error) throw error
      return data as { name: string; country?: string | null }
    },
    enabled: !!unitId,
  })

  const currency = getCurrencyForCountry(unit?.country)

  const { data: members = [] } = useQuery({
    queryKey: ['unit-members', unitId],
    queryFn: async () => {
      const { data: membersData, error } = await supabase
        .from('unit_members')
        .select('user_id')
        .eq('unit_id', unitId)
      if (error) throw error
      const userIds = membersData?.map((m) => m.user_id) || []
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
      return membersData?.map((m) => ({ user_id: m.user_id, profile: profileMap[m.user_id] })) || []
    },
    enabled: !!unitId,
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      setUploadError(null)
      let receiptUrl: string | null = null

      if (selectedFile) {
        if (!ACCEPTED_IMAGE_TYPES.includes(selectedFile.type)) {
          throw new Error('Please upload a valid image (JPEG, PNG, WebP, or GIF)')
        }
        if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
          throw new Error(`Image must be under ${MAX_SIZE_MB}MB`)
        }
        const ext = selectedFile.name.split('.').pop() || 'jpg'
        const path = `${unitId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })
        if (uploadErr) {
          setUploadError(uploadErr.message)
          throw new Error(uploadErr.message)
        }
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
        receiptUrl = urlData.publicUrl
      }

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          unit_id: unitId,
          category: data.category as ExpenseCategory,
          amount: data.amount,
          date: data.date,
          paid_by: data.paid_by,
          payment_mode: data.payment_mode || null,
          notes: data.notes || null,
          receipt_url: receiptUrl,
        })
        .select()
        .single()
      if (error) throw error
      return expense
    },
    onSuccess: () => {
      setSelectedFile(null)
      setPreviewUrl(null)
      queryClient.invalidateQueries({ queryKey: ['expenses', unitId] })
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] })
      navigate(`/units/${unitId}`)
    },
  })

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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'other',
      date: new Date().toISOString().slice(0, 10),
      paid_by: '',
      payment_mode: 'bank_transfer',
    },
  })

  useEffect(() => {
    if (members.length > 0) {
      setValue('paid_by', members[0].user_id)
    }
  }, [members, setValue])

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      {mutation.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {(mutation.error as Error).message}
        </div>
      )}
      <div className="space-y-2">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((cat) => (
            <label
              key={cat.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-foreground transition-colors dark:border-slate-700 dark:bg-slate-900 has-[:checked]:border-coral-500 has-[:checked]:bg-coral-50 has-[:checked]:text-coral-900 dark:has-[:checked]:border-coral-500 dark:has-[:checked]:bg-coral-950/30 dark:has-[:checked]:text-coral-100`}
            >
              <input type="radio" value={cat.value} {...register('category')} className="sr-only" />
              <span className={`h-2 w-2 shrink-0 rounded-full ${cat.color}`} />
              {cat.label}
            </label>
          ))}
        </div>
        {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount ({getCurrencySymbol(currency)})</Label>
        <Input id="amount" type="number" step="0.01" {...register('amount')} />
        {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...register('date')} />
        {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="paid_by">Paid by</Label>
        <select
          id="paid_by"
          {...register('paid_by')}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-800 dark:bg-slate-950"
        >
          {members.map((m: { user_id: string; profile?: { name: string } }) => (
            <option key={m.user_id} value={m.user_id}>
              {m.profile?.name || m.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="payment_mode">Payment mode</Label>
        <select
          id="payment_mode"
          {...register('payment_mode')}
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
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" placeholder="e.g. Grocery run" {...register('notes')} />
      </div>

      <div className="space-y-2">
        <Label>Receipt / image (optional)</Label>
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
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-coral-700 dark:hover:bg-coral-950/20"
          >
            <ImagePlus className="h-5 w-5" />
            Click to upload receipt or image
          </button>
        ) : (
          <div className="relative">
            <img
              src={previewUrl!}
              alt="Receipt preview"
              className="max-h-40 w-full rounded-lg border object-contain"
            />
            <button
              type="button"
              onClick={clearFile}
              className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1.5 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP or GIF. Max {MAX_SIZE_MB}MB.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Adding...' : 'Add expense'}
      </Button>
    </form>
  )
}
