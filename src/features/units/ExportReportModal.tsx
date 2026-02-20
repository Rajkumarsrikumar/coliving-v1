import { useState } from 'react'
import { FileDown, FileText, Home, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Label } from '../../components/ui/Label'
import { exportUnitReport, exportUnitReportPDF } from '../../lib/exportUtils'
import { getMemberShare, getExpectedAmount } from '../../lib/utils'
import { getCurrencyForCountry } from '../../constants/countries'
import type { Unit, Expense, UnitMember } from '../../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface ExportReportModalProps {
  unit: Unit
  members: (UnitMember & { profile?: { name?: string | null } })[]
  expenses: (Expense & { payer?: { name?: string | null } })[]
  onClose: () => void
}

export function ExportReportModal({ unit, members, expenses, onClose }: ExportReportModalProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [format, setFormat] = useState<'csv' | 'pdf'>('pdf')
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(
    () => new Set(members.map((m) => m.user_id))
  )

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
  const filteredMembers = members.filter((m) => selectedTenants.has(m.user_id))

  const toggleTenant = (userId: string) => {
    setSelectedTenants((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const selectAllTenants = () => setSelectedTenants(new Set(members.map((m) => m.user_id)))
  const clearAllTenants = () => setSelectedTenants(new Set())

  const handleExport = () => {
    const reportMembers = filteredMembers.length > 0 ? filteredMembers : members
    const params = {
      unitName: unit.name,
      month,
      year,
      expenses,
      members: reportMembers,
      allMembers: members,
      monthlyRent: unit.monthly_rent ?? 0,
      currency: getCurrencyForCountry(unit.country),
      getMemberShare,
      getExpectedAmount,
    }
    if (format === 'pdf') {
      exportUnitReportPDF(params)
    } else {
      exportUnitReport(params)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl bg-card p-4 shadow-xl sm:max-w-md sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileDown className="h-5 w-5" />
            Export report
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 rounded-full p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
          <Home className="h-5 w-5 shrink-0 text-coral-500" />
          <div>
            <p className="font-medium text-foreground">CoTenanty</p>
            <p className="text-xs text-muted-foreground">
              Unit Report — {unit.name} — {MONTHS[month - 1]} {year}
            </p>
          </div>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Export unit report with monthly expenses, tenant contributions, and expense details.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-month">Month</Label>
            <select
              id="report-month"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-foreground"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-year">Year</Label>
              <select
                id="report-year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-foreground"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  format === 'pdf'
                    ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  format === 'csv'
                    ? 'border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/30 dark:text-coral-300'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                CSV / Excel
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Filter by tenants</Label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selectAllTenants}
                  className="text-xs text-coral-500 hover:underline"
                >
                  All
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={clearAllTenants}
                  className="text-xs text-coral-500 hover:underline"
                >
                  None
                </button>
              </div>
            </div>
            <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border p-2">
              {members.map((m) => (
                <label
                  key={m.user_id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedTenants.has(m.user_id)}
                    onChange={() => toggleTenant(m.user_id)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">
                    {m.profile?.name || 'Unknown'}
                    {(m.role === 'master_tenant' || m.role === 'owner') && (
                      <span className="ml-1 text-xs text-muted-foreground">(Master)</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredMembers.length} tenant{filteredMembers.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleExport} className="flex-1">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}
