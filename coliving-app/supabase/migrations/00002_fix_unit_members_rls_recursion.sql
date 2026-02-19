-- Fix infinite recursion: unit_members policies were querying unit_members,
-- which triggered RLS again. Use SECURITY DEFINER functions to bypass RLS for the check.

-- Helper: check if user is a member of a unit (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_unit_member(p_unit_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unit_members WHERE unit_id = p_unit_id AND user_id = p_user_id
  );
$$;

-- Helper: check if user is an owner of a unit (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_unit_owner(p_unit_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unit_members WHERE unit_id = p_unit_id AND user_id = p_user_id AND role = 'owner'
  );
$$;

-- Helper: get unit_id for a contribution (bypasses RLS, avoids recursion in contribution_payments)
CREATE OR REPLACE FUNCTION public.get_contribution_unit_id(p_contribution_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT unit_id FROM contributions WHERE id = p_contribution_id LIMIT 1;
$$;

-- Drop old unit_members policies
DROP POLICY IF EXISTS "Unit members can view unit_members" ON unit_members;
DROP POLICY IF EXISTS "Unit owners can insert members" ON unit_members;
DROP POLICY IF EXISTS "Unit owners can update members" ON unit_members;
DROP POLICY IF EXISTS "Unit owners or self can delete members" ON unit_members;

-- Recreate using helper functions (no recursion)
CREATE POLICY "Unit members can view unit_members" ON unit_members FOR SELECT
  USING (public.is_unit_member(unit_id, auth.uid()));

CREATE POLICY "Unit owners can insert members" ON unit_members FOR INSERT WITH CHECK (
  public.is_unit_owner(unit_id, auth.uid()) OR (user_id = auth.uid())
);

CREATE POLICY "Unit owners can update members" ON unit_members FOR UPDATE
  USING (public.is_unit_owner(unit_id, auth.uid()));

CREATE POLICY "Unit owners or self can delete members" ON unit_members FOR DELETE
  USING (public.is_unit_owner(unit_id, auth.uid()) OR user_id = auth.uid());

-- Also update units policies to use helper (avoids potential issues)
DROP POLICY IF EXISTS "Unit members can view units" ON units;
DROP POLICY IF EXISTS "Unit owners can update units" ON units;
DROP POLICY IF EXISTS "Unit owners can delete units" ON units;

CREATE POLICY "Unit members can view units" ON units FOR SELECT
  USING (public.is_unit_member(units.id, auth.uid()));

CREATE POLICY "Unit owners can update units" ON units FOR UPDATE
  USING (public.is_unit_owner(units.id, auth.uid()));

CREATE POLICY "Unit owners can delete units" ON units FOR DELETE
  USING (public.is_unit_owner(units.id, auth.uid()));

-- Update expenses, contributions, contribution_payments to use helper
DROP POLICY IF EXISTS "Unit members can view expenses" ON expenses;
DROP POLICY IF EXISTS "Unit members can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Unit members can update expenses" ON expenses;
DROP POLICY IF EXISTS "Unit members can delete expenses" ON expenses;

CREATE POLICY "Unit members can view expenses" ON expenses FOR SELECT
  USING (public.is_unit_member(expenses.unit_id, auth.uid()));

CREATE POLICY "Unit members can insert expenses" ON expenses FOR INSERT WITH CHECK (
  public.is_unit_member(expenses.unit_id, auth.uid())
);

CREATE POLICY "Unit members can update expenses" ON expenses FOR UPDATE
  USING (public.is_unit_member(expenses.unit_id, auth.uid()));

CREATE POLICY "Unit members can delete expenses" ON expenses FOR DELETE
  USING (public.is_unit_member(expenses.unit_id, auth.uid()));

DROP POLICY IF EXISTS "Unit members can view contributions" ON contributions;
DROP POLICY IF EXISTS "Unit members can insert contributions" ON contributions;
DROP POLICY IF EXISTS "Unit members can update contributions" ON contributions;
DROP POLICY IF EXISTS "Unit members can delete contributions" ON contributions;

CREATE POLICY "Unit members can view contributions" ON contributions FOR SELECT
  USING (public.is_unit_member(contributions.unit_id, auth.uid()));

CREATE POLICY "Unit members can insert contributions" ON contributions FOR INSERT WITH CHECK (
  public.is_unit_member(contributions.unit_id, auth.uid())
);

CREATE POLICY "Unit members can update contributions" ON contributions FOR UPDATE
  USING (public.is_unit_member(contributions.unit_id, auth.uid()));

CREATE POLICY "Unit members can delete contributions" ON contributions FOR DELETE
  USING (public.is_unit_member(contributions.unit_id, auth.uid()));

DROP POLICY IF EXISTS "Unit members can view contribution_payments" ON contribution_payments;
DROP POLICY IF EXISTS "Unit members can insert contribution_payments" ON contribution_payments;

CREATE POLICY "Unit members can view contribution_payments" ON contribution_payments FOR SELECT
  USING (public.is_unit_member(public.get_contribution_unit_id(contribution_id), auth.uid()));

CREATE POLICY "Unit members can insert contribution_payments" ON contribution_payments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND public.is_unit_member(public.get_contribution_unit_id(contribution_id), auth.uid())
);
