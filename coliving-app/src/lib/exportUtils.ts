/**
 * Export data to CSV/Excel-compatible format.
 * Excel opens .csv files directly. Use .xlsx for native Excel format (requires xlsx lib).
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getCurrencySymbol } from '../constants/countries'

function escapeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportExpensesToExcel(
  expenses: { date: string; category: string; amount: number; payer?: { name?: string | null } | null; payment_mode?: string | null; notes?: string | null }[],
  unitName: string,
  currency: string = 'SGD'
) {
  const categoryLabels: Record<string, string> = {
    rent: 'Rent',
    pub: 'PUB',
    cleaning: 'Cleaning',
    provisions: 'Provisions',
    other: 'Other',
  }
  const paymentLabels: Record<string, string> = {
    bank_transfer: 'Bank transfer',
    paynow: 'PayNow',
    cash: 'Cash',
    credit_card: 'Credit card',
    grabpay: 'GrabPay',
    paylah: 'PayLah!',
    other: 'Other',
  }

  const headers = ['Date', 'Category', `Amount (${getCurrencySymbol(currency)})`, 'Paid By', 'Payment Mode', 'Notes']
  const rows = expenses.map((e) => [
    e.date,
    categoryLabels[e.category] || e.category,
    e.amount.toFixed(2),
    e.payer?.name || '',
    (e.payment_mode && paymentLabels[e.payment_mode]) || e.payment_mode || '',
    e.notes || '',
  ])

  const csv = [headers.map(escapeCsvValue).join(','), ...rows.map((r) => r.map(escapeCsvValue).join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const safeName = unitName.replace(/[^a-zA-Z0-9-_]/g, '_')
  downloadBlob(blob, `expenses_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportContributionsToExcel(
  contributions: {
    reason: string
    amount: number
    status: string
    requester?: { name?: string | null } | null
    created_at: string
    payments?: { profile?: { name?: string | null } | null; amount: number; paid_at: string }[]
  }[],
  unitName: string,
  currency: string = 'SGD'
) {
  const headers = ['Reason', `Amount (${getCurrencySymbol(currency)})`, 'Status', 'Requested By', 'Date', 'Payments']
  const rows = contributions.map((c) => {
    const paymentsStr = (c.payments || [])
      .map((p) => `${p.profile?.name || 'Unknown'}: ${(p.amount ?? 0).toFixed(2)} (${(p.paid_at || '').slice(0, 10)})`)
      .join('; ')
    return [
      c.reason,
      c.amount.toFixed(2),
      c.status,
      c.requester?.name || '',
      c.created_at.slice(0, 10),
      paymentsStr,
    ]
  })

  const csv = [headers.map(escapeCsvValue).join(','), ...rows.map((r) => r.map(escapeCsvValue).join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const safeName = unitName.replace(/[^a-zA-Z0-9-_]/g, '_')
  downloadBlob(blob, `contributions_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`)
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent',
  pub: 'PUB',
  cleaning: 'Cleaning',
  provisions: 'Provisions',
  other: 'Other',
}

type MemberForReport = { profile?: { name?: string | null } | null; role: string; contribution_type?: string; share_percentage?: number | null; fixed_amount?: number | null; contribution_period?: string | null; user_id: string }
type ExpenseForReport = { date: string; category: string; amount: number; paid_by?: string; payer?: { name?: string | null } | null; payment_mode?: string | null; notes?: string | null }

export function exportUnitReport(params: {
  unitName: string
  month: number
  year: number
  expenses: ExpenseForReport[]
  members: MemberForReport[]
  allMembers: MemberForReport[]
  monthlyRent: number
  currency?: string
  getMemberShare: (m: MemberForReport, members: MemberForReport[], rent: number) => number
  getExpectedAmount: (m: MemberForReport, members: MemberForReport[], total: number, rent: number) => number
}) {
  const { unitName, month, year, expenses, members, allMembers, monthlyRent, currency = 'SGD', getExpectedAmount } = params
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10)
  const monthExpenses = expenses.filter((e) => e.date >= monthStart && e.date <= monthEnd)
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = ['rent', 'pub', 'cleaning', 'provisions', 'other'].map((cat) => ({
    category: CATEGORY_LABELS[cat] || cat,
    amount: monthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  }))

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthLabel = MONTH_NAMES[month - 1]
  const reportName = `Unit Report — ${unitName} — ${monthLabel} ${year}`

  const lines: string[] = []
  lines.push('Coliving')
  lines.push(reportName)
  lines.push('')
  lines.push('Unit Report')
  lines.push(`Unit,${escapeCsvValue(unitName)}`)
  lines.push(`Period,${monthLabel} ${year}`)
  lines.push('')
  lines.push('Monthly Expenses by Category')
  lines.push(`Category,Amount (${getCurrencySymbol(currency)})`)
  byCategory.forEach((c) => lines.push(`${escapeCsvValue(c.category)},${c.amount.toFixed(2)}`))
  lines.push(`Total,${totalExpenses.toFixed(2)}`)
  lines.push('')
  lines.push('Tenant Contributions')
  const sym = getCurrencySymbol(currency)
  lines.push(`Name,Role,Contribution,Expected (${sym}),Paid (${sym}),Balance (${sym})`)
  members.forEach((m) => {
    const expected = getExpectedAmount(m, allMembers, totalExpenses, monthlyRent)
    const paid = monthExpenses.filter((e) => e.paid_by === m.user_id).reduce((s, e) => s + e.amount, 0)
    const balance = paid - expected
    const contribStr = m.contribution_type === 'share'
      ? `${m.share_percentage ?? 0}%`
      : `${m.fixed_amount ?? 0} ${m.contribution_period === 'yearly' ? '/yr' : '/mo'}`
    lines.push(
      [
        escapeCsvValue(m.profile?.name || 'Unknown'),
        escapeCsvValue(m.role === 'master_tenant' || m.role === 'owner' ? 'Master tenant' : 'Co-tenant'),
        escapeCsvValue(contribStr),
        expected.toFixed(2),
        paid.toFixed(2),
        balance.toFixed(2),
      ].join(',')
    )
  })
  lines.push('')
  lines.push('Expense Details')
  lines.push(`Date,Category,Amount (${getCurrencySymbol(currency)}),Paid By,Payment Mode,Notes`)
  monthExpenses
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e) => {
      lines.push(
        [
          e.date,
          escapeCsvValue(CATEGORY_LABELS[e.category] || e.category),
          e.amount.toFixed(2),
          escapeCsvValue(e.payer?.name || ''),
          escapeCsvValue(e.payment_mode || ''),
          escapeCsvValue(e.notes || ''),
        ].join(',')
      )
    })

  const csv = '\ufeff' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const safeName = unitName.replace(/[^a-zA-Z0-9-_]/g, '_')
  downloadBlob(blob, `report_${safeName}_${year}-${String(month).padStart(2, '0')}.csv`)
}

export function exportUnitReportPDF(params: {
  unitName: string
  month: number
  year: number
  expenses: ExpenseForReport[]
  members: MemberForReport[]
  allMembers: MemberForReport[]
  monthlyRent: number
  currency?: string
  getMemberShare: (m: MemberForReport, members: MemberForReport[], rent: number) => number
  getExpectedAmount: (m: MemberForReport, members: MemberForReport[], total: number, rent: number) => number
}) {
  const { unitName, month, year, expenses, members, allMembers, monthlyRent, currency = 'SGD', getExpectedAmount } = params
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10)
  const monthExpenses = expenses.filter((e) => e.date >= monthStart && e.date <= monthEnd)
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = ['rent', 'pub', 'cleaning', 'provisions', 'other'].map((cat) => ({
    category: CATEGORY_LABELS[cat] || cat,
    amount: monthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  }))

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthLabel = MONTH_NAMES[month - 1]

  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  let y = 18

  // Coliving header: icon + text + report name
  const coral = [245, 93, 74] as [number, number, number]
  doc.setFillColor(...coral)
  doc.roundedRect(14, y - 5, 8, 8, 1.5, 1.5, 'F')
  doc.setFontSize(16)
  doc.setTextColor(...coral)
  doc.setFont('helvetica', 'bold')
  doc.text('Coliving', 25, y + 1)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const reportName = `Unit Report — ${unitName} — ${monthLabel} ${year}`
  doc.text(reportName, 14, y + 8)
  y += 18

  doc.setFontSize(11)
  doc.setTextColor(51, 51, 51)
  doc.text(`Unit: ${unitName}`, 14, y)
  y += 7
  doc.text(`Period: ${monthLabel} ${year}`, 14, y)
  y += 12

  autoTable(doc, {
    startY: y,
    head: [['Category', `Amount (${getCurrencySymbol(currency)})`]],
    body: [...byCategory.map((c) => [c.category, c.amount.toFixed(2)]), ['Total', totalExpenses.toFixed(2)]],
    theme: 'grid',
    headStyles: { fillColor: [245, 93, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  const memberRows = members.map((m) => {
    const expected = getExpectedAmount(m, allMembers, totalExpenses, monthlyRent)
    const paid = monthExpenses.filter((e) => e.paid_by === m.user_id).reduce((s, e) => s + e.amount, 0)
    const balance = paid - expected
    const contribStr = m.contribution_type === 'share'
      ? `${m.share_percentage ?? 0}%`
      : `${m.fixed_amount ?? 0} ${m.contribution_period === 'yearly' ? '/yr' : '/mo'}`
    return [
      m.profile?.name || 'Unknown',
      m.role === 'master_tenant' || m.role === 'owner' ? 'Master tenant' : 'Co-tenant',
      contribStr,
      expected.toFixed(2),
      paid.toFixed(2),
      balance.toFixed(2),
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Role', 'Contribution', `Expected (${getCurrencySymbol(currency)})`, `Paid (${getCurrencySymbol(currency)})`, `Balance (${getCurrencySymbol(currency)})`]],
    body: memberRows,
    theme: 'grid',
    headStyles: { fillColor: [245, 93, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  const paymentLabels: Record<string, string> = {
    bank_transfer: 'Bank transfer',
    paynow: 'PayNow',
    cash: 'Cash',
    credit_card: 'Credit card',
    grabpay: 'GrabPay',
    paylah: 'PayLah!',
    other: 'Other',
  }
  const paymentLabel = (mode: string | null | undefined) =>
    mode ? (paymentLabels[mode] || mode) : ''
  const expenseRows = monthExpenses
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [
      e.date,
      CATEGORY_LABELS[e.category] || e.category,
      e.amount.toFixed(2),
      e.payer?.name || '',
      paymentLabel(e.payment_mode),
      (e.notes || '').slice(0, 30),
    ])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Category', `Amount (${getCurrencySymbol(currency)})`, 'Paid By', 'Payment Mode', 'Notes']],
    body: expenseRows,
    theme: 'grid',
    headStyles: { fillColor: [245, 93, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    columnStyles: { 5: { cellWidth: 40 } },
  })

  const safeName = unitName.replace(/[^a-zA-Z0-9-_]/g, '_')
  doc.save(`report_${safeName}_${year}-${String(month).padStart(2, '0')}.pdf`)
}
