-- Master tenant + co-tenant model with monthly/yearly fixed amounts
-- master_tenant = primary lease holder (creator), co_tenant = others

-- Add new roles (keep owner/renter for backward compat, add new ones)
ALTER TABLE unit_members DROP CONSTRAINT IF EXISTS unit_members_role_check;
ALTER TABLE unit_members ADD CONSTRAINT unit_members_role_check
  CHECK (role IN ('owner', 'renter', 'master_tenant', 'co_tenant'));

-- Add contribution period for fixed amounts (monthly or yearly)
ALTER TABLE unit_members
  ADD COLUMN IF NOT EXISTS contribution_period TEXT
  CHECK (contribution_period IS NULL OR contribution_period IN ('monthly', 'yearly'));

-- Migrate existing: owner -> master_tenant, renter -> co_tenant
UPDATE unit_members SET role = 'master_tenant' WHERE role = 'owner';
UPDATE unit_members SET role = 'co_tenant' WHERE role = 'renter';

-- Restrict to new roles only
ALTER TABLE unit_members DROP CONSTRAINT IF EXISTS unit_members_role_check;
ALTER TABLE unit_members ADD CONSTRAINT unit_members_role_check
  CHECK (role IN ('master_tenant', 'co_tenant'));

-- Update is_unit_owner to recognize master_tenant (for RLS)
CREATE OR REPLACE FUNCTION public.is_unit_owner(p_unit_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unit_members
    WHERE unit_id = p_unit_id AND user_id = p_user_id
    AND role IN ('owner', 'master_tenant')
  );
$$;

-- Update create_unit_and_join: creator becomes master_tenant
CREATE OR REPLACE FUNCTION public.create_unit_and_join(
  p_name TEXT,
  p_address TEXT DEFAULT NULL,
  p_monthly_rent DECIMAL DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  monthly_rent DECIMAL,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_unit_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO units (name, address, monthly_rent, created_by)
  VALUES (p_name, p_address, p_monthly_rent, v_user_id)
  RETURNING units.id INTO v_unit_id;

  -- Creator = master tenant with 100% share
  INSERT INTO unit_members (unit_id, user_id, role, contribution_type, share_percentage, fixed_amount, contribution_period)
  VALUES (v_unit_id, v_user_id, 'master_tenant', 'share', 100, NULL, NULL);

  RETURN QUERY SELECT u.id, u.name, u.address, u.monthly_rent, u.created_by, u.created_at, u.updated_at
  FROM units u WHERE u.id = v_unit_id;
END;
$$;

-- Update add_member_by_email: add co-tenants with share or fixed (monthly/yearly)
DROP FUNCTION IF EXISTS public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.add_member_by_email(
  p_unit_id UUID,
  p_email TEXT,
  p_contribution_type TEXT DEFAULT 'share',
  p_share_percentage DECIMAL DEFAULT NULL,
  p_fixed_amount DECIMAL DEFAULT NULL,
  p_contribution_period TEXT DEFAULT 'monthly',
  p_role TEXT DEFAULT 'co_tenant'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id UUID;
  v_invitee_id UUID;
  v_existing BOOLEAN;
BEGIN
  v_inviter_id := auth.uid();
  IF v_inviter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT public.is_unit_owner(p_unit_id, v_inviter_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only master tenant can add co-tenants');
  END IF;

  SELECT id INTO v_invitee_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF v_invitee_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No account found with that email. They need to sign up first.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM unit_members WHERE unit_id = p_unit_id AND user_id = v_invitee_id
  ) INTO v_existing;

  IF v_existing THEN
    RETURN jsonb_build_object('success', false, 'error', 'This person is already a member');
  END IF;

  IF p_contribution_type = 'share' THEN
    IF p_share_percentage IS NULL OR p_share_percentage < 0 OR p_share_percentage > 100 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Share must be between 0 and 100');
    END IF;
    INSERT INTO unit_members (unit_id, user_id, role, contribution_type, share_percentage, fixed_amount, contribution_period)
    VALUES (p_unit_id, v_invitee_id, 'co_tenant', 'share', p_share_percentage, NULL, NULL);
  ELSIF p_contribution_type = 'fixed' THEN
    IF p_fixed_amount IS NULL OR p_fixed_amount < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Fixed amount must be 0 or more');
    END IF;
    IF p_contribution_period NOT IN ('monthly', 'yearly') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Period must be monthly or yearly');
    END IF;
    INSERT INTO unit_members (unit_id, user_id, role, contribution_type, share_percentage, fixed_amount, contribution_period)
    VALUES (p_unit_id, v_invitee_id, 'co_tenant', 'fixed', NULL, p_fixed_amount, p_contribution_period);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Contribution type must be share or fixed');
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', v_invitee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT) TO service_role;
