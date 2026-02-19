import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, X, FileText } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'
import { COUNTRIES_WITH_CURRENCY, getCurrencyForCountry, getCurrencySymbol } from '../../constants/countries'
import type { Unit, UnitMember } from '../../types'
import type { ContributionType, ContributionPeriod } from '../../types'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ACCEPTED_CONTRACT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 5
const MAX_CONTRACT_MB = 10

interface EditUnitModalProps {
  unit: Unit
  masterTenantMember?: UnitMember | null
  onClose: () => void
}

export function EditUnitModal({ unit, masterTenantMember, onClose }: EditUnitModalProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contractInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(unit.name)
  const [address, setAddress] = useState(unit.address || '')
  const [country, setCountry] = useState(unit.country || '')
  const unitCurrency = getCurrencyForCountry(country || unit.country)
  const [zipcode, setZipcode] = useState(unit.zipcode || '')
  const [monthlyRent, setMonthlyRent] = useState(String(unit.monthly_rent || 0))
  const [contactStart, setContactStart] = useState(unit.contact_start_date || '')
  const [contactExpiry, setContactExpiry] = useState(unit.contact_expiry_date || '')
  const [agentName, setAgentName] = useState(unit.agent_name || '')
  const [agentEmail, setAgentEmail] = useState(unit.agent_email || '')
  const [agentPhone, setAgentPhone] = useState(unit.agent_phone || '')
  const [masterContributionType, setMasterContributionType] = useState<ContributionType>(
    (masterTenantMember?.contribution_type as ContributionType) || 'share'
  )
  const [masterShare, setMasterShare] = useState(String(masterTenantMember?.share_percentage ?? 100))
  const [masterFixedAmount, setMasterFixedAmount] = useState(String(masterTenantMember?.fixed_amount ?? 0))
  const [masterContributionPeriod, setMasterContributionPeriod] = useState<ContributionPeriod>(
    (masterTenantMember?.contribution_period as ContributionPeriod) || 'monthly'
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(unit.image_url || null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractRemoved, setContractRemoved] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      setUploadError(null)
      let imageUrl: string | null = imageRemoved ? null : (unit.image_url || null)
      let contractUrl: string | null = contractRemoved ? null : (unit.contract_url || null)

      if (selectedFile) {
        if (!ACCEPTED_IMAGE_TYPES.includes(selectedFile.type)) {
          throw new Error('Please upload a valid image (JPEG, PNG, WebP, or GIF)')
        }
        if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
          throw new Error(`Image must be under ${MAX_SIZE_MB}MB`)
        }
        const ext = selectedFile.name.split('.').pop() || 'jpg'
        const path = `${unit.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('unit-images').upload(path, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })
        if (uploadErr) {
          setUploadError(uploadErr.message)
          throw new Error(uploadErr.message)
        }
        const { data: urlData } = supabase.storage.from('unit-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      if (contractFile) {
        if (!ACCEPTED_CONTRACT_TYPES.includes(contractFile.type)) {
          throw new Error('Please upload PDF or image (JPEG, PNG, WebP)')
        }
        if (contractFile.size > MAX_CONTRACT_MB * 1024 * 1024) {
          throw new Error(`Contract must be under ${MAX_CONTRACT_MB}MB`)
        }
        const ext = contractFile.name.split('.').pop() || 'pdf'
        const path = `${unit.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('contracts').upload(path, contractFile, {
          cacheControl: '3600',
          upsert: false,
        })
        if (uploadErr) throw new Error(uploadErr.message)
        const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(path)
        contractUrl = urlData.publicUrl
      }

      const { error } = await supabase
        .from('units')
        .update({
          name: name.trim(),
          address: address.trim() || null,
          country: country.trim() || null,
          zipcode: zipcode.trim() || null,
          monthly_rent: parseFloat(monthlyRent) || 0,
          image_url: imageUrl,
          contact_start_date: contactStart || null,
          contact_expiry_date: contactExpiry || null,
          agent_name: agentName.trim() || null,
          agent_email: agentEmail.trim() || null,
          agent_phone: agentPhone.trim() || null,
          contract_url: contractUrl,
        })
        .eq('id', unit.id)

      if (error) throw error

      if (masterTenantMember) {
        const share = masterContributionType === 'share' ? parseFloat(masterShare) || 100 : null
        const fixed = masterContributionType === 'fixed' ? parseFloat(masterFixedAmount) || 0 : null
        await supabase
          .from('unit_members')
          .update({
            contribution_type: masterContributionType,
            share_percentage: masterContributionType === 'share' ? Math.min(100, Math.max(0, share ?? 0)) : null,
            fixed_amount: masterContributionType === 'fixed' ? fixed : null,
            contribution_period: masterContributionType === 'fixed' ? masterContributionPeriod : null,
          })
          .eq('id', masterTenantMember.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unit.id] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['unit-members', unit.id] })
      onClose()
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
      setImageRemoved(false)
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setImageRemoved(true)
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!ACCEPTED_CONTRACT_TYPES.includes(file.type)) {
        setUploadError('Please upload PDF or image (JPEG, PNG, WebP)')
        return
      }
      if (file.size > MAX_CONTRACT_MB * 1024 * 1024) {
        setUploadError(`Contract must be under ${MAX_CONTRACT_MB}MB`)
        return
      }
      setUploadError(null)
      setContractRemoved(false)
      setContractFile(file)
    }
  }

  const clearContract = () => {
    setContractFile(null)
    setContractRemoved(true)
    if (contractInputRef.current) contractInputRef.current.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 sm:p-6" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-card p-4 shadow-xl scrollbar-hide dark:border-slate-800 sm:max-w-md sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Edit unit</h2>
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
          {mutation.error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {(mutation.error as Error).message}
            </div>
          )}

          <div className="space-y-2">
            <Label>Unit image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Unit"
                  className="h-32 w-full rounded-lg border object-cover"
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
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-coral-700 dark:hover:bg-coral-950/20"
              >
                <ImagePlus className="h-5 w-5" />
                Click to upload unit image
              </button>
            )}
            {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name">Unit name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Address (optional)</Label>
            <Input
              id="edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-country">Country</Label>
              <select
                id="edit-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-800 dark:bg-slate-950 dark:text-foreground"
              >
                <option value="">Select country</option>
                {COUNTRIES_WITH_CURRENCY.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zipcode">ZIP / Postal code (optional)</Label>
              <Input
                id="edit-zipcode"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                placeholder="e.g. 123456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-rent">Monthly rent ({getCurrencySymbol(unitCurrency)})</Label>
            <Input
              id="edit-rent"
              type="number"
              min={0}
              step={0.01}
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
            />
          </div>

          {masterTenantMember && (
            <div className="space-y-3">
              <Label>Master tenant contribution</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMasterContributionType('share')}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    masterContributionType === 'share'
                      ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  By share %
                </button>
                <button
                  type="button"
                  onClick={() => setMasterContributionType('fixed')}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    masterContributionType === 'fixed'
                      ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  By fixed amount
                </button>
              </div>
              {masterContributionType === 'share' ? (
                <div className="space-y-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={masterShare}
                    onChange={(e) => setMasterShare(e.target.value)}
                    placeholder="e.g. 100"
                  />
                  <p className="text-xs text-muted-foreground">Your share of expenses (default 100% if sole tenant)</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="master-fixed">Fixed amount ({getCurrencySymbol(unitCurrency)})</Label>
                    <Input
                      id="master-fixed"
                      type="number"
                      min={0}
                      step={0.01}
                      value={masterFixedAmount}
                      onChange={(e) => setMasterFixedAmount(e.target.value)}
                      placeholder="e.g. 1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing period</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMasterContributionPeriod('monthly')}
                        className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                          masterContributionPeriod === 'monthly'
                            ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setMasterContributionPeriod('yearly')}
                        className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                          masterContributionPeriod === 'yearly'
                            ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Yearly
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {masterContributionPeriod === 'yearly'
                        ? `Yearly amount (e.g. 12000 = ${getCurrencySymbol(unitCurrency)}1000/mo)`
                        : 'Monthly contribution amount'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium">Lease & agent</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="contact-start">Contract start date</Label>
                <Input
                  id="contact-start"
                  type="date"
                  value={contactStart}
                  onChange={(e) => setContactStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-expiry">Contract expiry date</Label>
                <Input
                  id="contact-expiry"
                  type="date"
                  value={contactExpiry}
                  onChange={(e) => setContactExpiry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent name</Label>
                <Input
                  id="agent-name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. John Tan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-email">Agent email</Label>
                <Input
                  id="agent-email"
                  type="email"
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  placeholder="agent@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-phone">Agent phone</Label>
                <Input
                  id="agent-phone"
                  type="tel"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="+65 9123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Contract document</Label>
                <input
                  ref={contractInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleContractChange}
                  className="hidden"
                />
                {unit.contract_url && !contractFile && !contractRemoved ? (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <a href={unit.contract_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-coral-600 hover:underline dark:text-coral-400">
                      <FileText className="h-4 w-4" />
                      View contract
                    </a>
                    <Button type="button" variant="ghost" size="sm" onClick={clearContract}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => contractInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-coral-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-coral-700"
                  >
                    <FileText className="h-5 w-5" />
                    {contractFile ? contractFile.name : 'Upload contract (PDF or image)'}
                  </button>
                )}
                <p className="text-xs text-muted-foreground">PDF or image. Max {MAX_CONTRACT_MB}MB.</p>
              </div>
            </div>
          </div>

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
  )
}
