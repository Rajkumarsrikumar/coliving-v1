import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'SGD'): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/** Get monthly implied amount for a member (for balance calculation) */
function getMonthlyImplied(
  m: { contribution_type?: string; share_percentage?: number | null; fixed_amount?: number | null; contribution_period?: string | null },
  monthlyRent: number
): number {
  const t = m.contribution_type || 'share'
  if (t === 'share') return ((m.share_percentage ?? 0) / 100) * monthlyRent
  const fixed = m.fixed_amount ?? 0
  return m.contribution_period === 'yearly' ? fixed / 12 : fixed
}

/** Get member's share fraction (0-1) for balance calculation. Supports share %, fixed (monthly/yearly). */
export function getMemberShare(
  member: { contribution_type?: string; share_percentage?: number | null; fixed_amount?: number | null; contribution_period?: string | null },
  members: { contribution_type?: string; share_percentage?: number | null; fixed_amount?: number | null; contribution_period?: string | null }[],
  monthlyRent: number
): number {
  const type = member.contribution_type || 'share'
  if (type === 'share') {
    return (member.share_percentage ?? 0) / 100
  }
  const impliedAmounts = members.map((m) => getMonthlyImplied(m, monthlyRent))
  const total = impliedAmounts.reduce((s, a) => s + a, 0)
  if (total <= 0) return 0
  return getMonthlyImplied(member, monthlyRent) / total
}

/** Get expected monthly amount for a member based on share or fixed amount */
export function getExpectedAmount(
  member: { contribution_type?: string; share_percentage?: number | null; fixed_amount?: number | null; contribution_period?: string | null },
  members: { contribution_type?: string; share_percentage?: number | null; fixed_amount?: number | null; contribution_period?: string | null }[],
  monthlyTotal: number,
  monthlyRent: number
): number {
  const type = member.contribution_type || 'share'
  if (type === 'fixed') {
    const fixed = member.fixed_amount ?? 0
    return member.contribution_period === 'yearly' ? fixed / 12 : fixed
  }
  const share = getMemberShare(member, members, monthlyRent)
  return monthlyTotal * share
}

/** Get next payment due date for current month (or next month if due date passed) */
export function getNextDueDate(dueDay: number): Date {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dueDay)
  return thisMonth >= now ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, dueDay)
}

/** Format due date for display (e.g. "5th of each month") */
export function formatDueDate(dueDay: number): string {
  const suffix = dueDay === 1 || dueDay === 21 ? 'st' : dueDay === 2 || dueDay === 22 ? 'nd' : dueDay === 3 || dueDay === 23 ? 'rd' : 'th'
  return `${dueDay}${suffix} of each month`
}

/** Format member contribution for display */
export function formatMemberContribution(
  member: {
    contribution_type?: string
    share_percentage?: number | null
    fixed_amount?: number | null
    contribution_period?: string | null
    contribution_end_date?: string | null
  },
  currency: string = 'SGD',
  options?: { short?: boolean }
): string {
  const type = member.contribution_type || 'share'
  let base: string
  if (type === 'share') {
    base = `${member.share_percentage ?? 0}%`
  } else {
    const period = member.contribution_period || 'monthly'
    base = `${formatCurrency(member.fixed_amount ?? 0, currency)}/${period === 'yearly' ? 'yr' : 'mo'}`
  }
  if (!options?.short && member.contribution_end_date) {
    return `${base} until ${formatDate(member.contribution_end_date)}`
  }
  return base
}
