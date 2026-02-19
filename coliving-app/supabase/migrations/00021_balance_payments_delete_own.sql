-- Users can delete their own balance_payment entries (created by them)
CREATE POLICY "Users can delete own balance_payments" ON balance_payments FOR DELETE
  USING (
    public.is_unit_member(unit_id, auth.uid()) AND from_user_id = auth.uid()
  );
