import type { ExpenseCategory, MemberRole, ContributionStatus } from './database'

export type { ExpenseCategory, MemberRole, ContributionStatus }

export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  name: string
  address: string | null
  country: string | null
  zipcode: string | null
  monthly_rent: number
  image_url?: string | null
  payment_due_day?: number | null
  contact_start_date?: string | null
  contact_expiry_date?: string | null
  agent_name?: string | null
  agent_email?: string | null
  agent_phone?: string | null
  contract_url?: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ContributionType = 'share' | 'fixed'
export type ContributionPeriod = 'monthly' | 'yearly'
export type TenantRole = 'master_tenant' | 'co_tenant'

export interface UnitMember {
  id: string
  unit_id: string
  user_id: string
  role: TenantRole | string
  contribution_type: ContributionType
  share_percentage: number | null
  fixed_amount: number | null
  contribution_period: ContributionPeriod | null
  contribution_end_date?: string | null
  joined_at: string
  profile?: Profile
}

export type PaymentMode = 'bank_transfer' | 'paynow' | 'cash' | 'grabpay' | 'paylah' | 'credit_card' | 'other'

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'paynow', label: 'PayNow' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'grabpay', label: 'GrabPay' },
  { value: 'paylah', label: 'PayLah!' },
  { value: 'other', label: 'Other' },
]

export interface Expense {
  id: string
  unit_id: string
  category: ExpenseCategory
  amount: number
  paid_by: string
  date: string
  notes: string | null
  payment_mode?: PaymentMode | null
  receipt_url?: string | null
  created_at: string
  payer?: Profile
}

export interface ExpectedExpense {
  id: string
  unit_id: string
  category: ExpenseCategory
  amount: number
}

export interface ExpectedExpenseEntry {
  id: string
  unit_id: string
  month: string
  category: ExpenseCategory
  amount: number
  created_at?: string
}

export interface Contribution {
  id: string
  unit_id: string
  amount: number
  reason: string
  requested_by: string
  status: ContributionStatus
  created_at: string
  requester?: Profile
  payments?: ContributionPayment[]
}

export interface ContributionPayment {
  id: string
  contribution_id: string
  user_id: string
  amount: number
  paid_at: string
  payment_mode?: PaymentMode | null
  receipt_url?: string | null
  profile?: Profile
}

const CHART_COLORS: Record<string, string> = {
  Rent: '#3b82f6',
  PUB: '#22c55e',
  Cleaning: '#f59e0b',
  Provisions: '#a855f7',
  Other: '#6b7280',
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; color: string; chartColor: string }[] = [
  { value: 'rent', label: 'Rent', color: 'bg-blue-500', chartColor: CHART_COLORS.Rent },
  { value: 'pub', label: 'PUB', color: 'bg-green-500', chartColor: CHART_COLORS.PUB },
  { value: 'cleaning', label: 'Cleaning', color: 'bg-amber-500', chartColor: CHART_COLORS.Cleaning },
  { value: 'provisions', label: 'Provisions', color: 'bg-purple-500', chartColor: CHART_COLORS.Provisions },
  { value: 'other', label: 'Other', color: 'bg-gray-500', chartColor: CHART_COLORS.Other },
]
