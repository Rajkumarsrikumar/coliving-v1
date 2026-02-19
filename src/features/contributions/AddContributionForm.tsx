import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { getCurrencyForCountry, getCurrencySymbol } from '../../constants/countries'

const schema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
})

type FormData = z.infer<typeof schema>

interface AddContributionFormProps {
  unitId: string
}

export function AddContributionForm({ unitId }: AddContributionFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id
      if (!userId) throw new Error('Not authenticated')
      const { data: contrib, error } = await supabase
        .from('contributions')
        .insert({
          unit_id: unitId,
          amount: data.amount,
          reason: data.reason,
          requested_by: userId,
          status: 'pending',
        })
        .select()
        .single()
      if (error) throw error
      return contrib
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions', unitId] })
      navigate(`/units/${unitId}/contributions`)
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      {mutation.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {(mutation.error as Error).message}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount ({getCurrencySymbol(currency)})</Label>
        <Input id="amount" type="number" step="0.01" {...register('amount')} />
        {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Input id="reason" placeholder="e.g. Repair, Extra cleaning" {...register('reason')} />
        {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Requesting...' : 'Request contribution'}
      </Button>
    </form>
  )
}
