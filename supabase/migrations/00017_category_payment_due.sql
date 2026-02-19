-- Per-category payment due dates: master tenant sets when each bill category is due
-- Supports the 5 fixed categories (rent, pub, cleaning, provisions, other) plus custom categories

CREATE TABLE IF NOT EXISTS category_payment_due (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, category)
);

COMMENT ON TABLE category_payment_due IS 'Payment due day (1-31) per expense category. Master tenant defines when each bill is due.';

CREATE INDEX IF NOT EXISTS idx_category_payment_due_unit ON category_payment_due(unit_id);

ALTER TABLE category_payment_due ENABLE ROW LEVEL SECURITY;

-- Unit members can view
CREATE POLICY "Unit members can view category_payment_due" ON category_payment_due FOR SELECT
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = category_payment_due.unit_id AND user_id = auth.uid()));

-- Unit owners/master tenants can manage
CREATE POLICY "Unit owners can manage category_payment_due" ON category_payment_due FOR ALL
  USING (public.is_unit_owner(category_payment_due.unit_id, auth.uid()))
  WITH CHECK (public.is_unit_owner(category_payment_due.unit_id, auth.uid()));
