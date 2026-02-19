-- Balance payments: when a co-tenant records paying their share to master tenant or directly
CREATE TABLE IF NOT EXISTS balance_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  for_month DATE NOT NULL,
  payment_mode TEXT CHECK (payment_mode IN ('bank_transfer', 'paynow', 'cash', 'grabpay', 'paylah', 'other')),
  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE balance_payments IS 'Records when a member pays their share. to_user_id = master tenant, or NULL = paid directly (e.g. to landlord)';

CREATE INDEX IF NOT EXISTS idx_balance_payments_unit_month ON balance_payments(unit_id, for_month);

ALTER TABLE balance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Unit members can view balance_payments" ON balance_payments FOR SELECT
  USING (public.is_unit_member(unit_id, auth.uid()));

CREATE POLICY "Unit members can insert balance_payments" ON balance_payments FOR INSERT WITH CHECK (
  public.is_unit_member(unit_id, auth.uid()) AND from_user_id = auth.uid()
);
