-- Master tenant can delete balance_payment entries (e.g. to correct mistakes)
CREATE POLICY "Master tenant can delete balance_payments" ON balance_payments FOR DELETE
  USING (public.is_unit_owner(unit_id, auth.uid()));
