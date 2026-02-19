-- Contract start date (lease start)
ALTER TABLE units ADD COLUMN IF NOT EXISTS contact_start_date DATE;
COMMENT ON COLUMN units.contact_start_date IS 'Lease/contract start date';

-- Expected expenses template: monthly expected amount per category
CREATE TABLE IF NOT EXISTS expected_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('rent', 'pub', 'cleaning', 'provisions', 'other')),
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  UNIQUE(unit_id, category)
);

COMMENT ON TABLE expected_expenses IS 'Monthly expected amount per category. Used to generate expected entries for each month in contract period.';

-- Expected expense entries: one per month per category (generated from template)
CREATE TABLE IF NOT EXISTS expected_expense_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rent', 'pub', 'cleaning', 'provisions', 'other')),
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, month, category)
);

COMMENT ON TABLE expected_expense_entries IS 'Expected expense amount for a specific month. Generated from expected_expenses for each month in contract period.';

CREATE INDEX IF NOT EXISTS idx_expected_expense_entries_unit_month ON expected_expense_entries(unit_id, month);

ALTER TABLE expected_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expected_expense_entries ENABLE ROW LEVEL SECURITY;

-- RLS: unit members can view
CREATE POLICY "Unit members can view expected_expenses" ON expected_expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = expected_expenses.unit_id AND user_id = auth.uid()));

-- RLS: unit owners can insert/update/delete
CREATE POLICY "Unit owners can manage expected_expenses" ON expected_expenses FOR ALL
  USING (public.is_unit_owner(expected_expenses.unit_id, auth.uid()))
  WITH CHECK (public.is_unit_owner(expected_expenses.unit_id, auth.uid()));

-- RLS: unit members can view entries
CREATE POLICY "Unit members can view expected_expense_entries" ON expected_expense_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = expected_expense_entries.unit_id AND user_id = auth.uid()));

-- RLS: unit owners can manage entries
CREATE POLICY "Unit owners can manage expected_expense_entries" ON expected_expense_entries FOR ALL
  USING (public.is_unit_owner(expected_expense_entries.unit_id, auth.uid()))
  WITH CHECK (public.is_unit_owner(expected_expense_entries.unit_id, auth.uid()));
