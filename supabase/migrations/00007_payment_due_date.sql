-- Payment due date: master tenant sets when co-tenants must pay each month
-- payment_due_day: 1-28 (day of month, e.g. 5 = 5th of each month)

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS payment_due_day INTEGER
  CHECK (payment_due_day IS NULL OR (payment_due_day >= 1 AND payment_due_day <= 28));

COMMENT ON COLUMN units.payment_due_day IS 'Day of month (1-28) by which co-tenants should pay. Master tenant sets this.';

-- Fix units RLS: allow master_tenant (after 00006 migrated owner -> master_tenant)
DROP POLICY IF EXISTS "Unit owners can update units" ON units;
CREATE POLICY "Unit owners can update units" ON units FOR UPDATE
  USING (public.is_unit_owner(id, auth.uid()));

DROP POLICY IF EXISTS "Unit owners can delete units" ON units;
CREATE POLICY "Unit owners can delete units" ON units FOR DELETE
  USING (public.is_unit_owner(id, auth.uid()));
