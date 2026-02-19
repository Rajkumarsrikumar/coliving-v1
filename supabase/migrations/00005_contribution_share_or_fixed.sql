-- Add support for contribution by share % OR fixed amount
ALTER TABLE unit_members
  ADD COLUMN IF NOT EXISTS contribution_type TEXT NOT NULL DEFAULT 'share' CHECK (contribution_type IN ('share', 'fixed')),
  ADD COLUMN IF NOT EXISTS fixed_amount DECIMAL(12, 2) CHECK (fixed_amount IS NULL OR fixed_amount >= 0);

-- Make share_percentage nullable when using fixed
ALTER TABLE unit_members ALTER COLUMN share_percentage DROP NOT NULL;

-- Update share_percentage constraint to allow NULL (when using fixed)
ALTER TABLE unit_members DROP CONSTRAINT IF EXISTS unit_members_share_percentage_check;
ALTER TABLE unit_members ADD CONSTRAINT unit_members_share_percentage_check
  CHECK (share_percentage IS NULL OR (share_percentage >= 0 AND share_percentage <= 100));

-- Drop old function signature (4 params)
DROP FUNCTION IF EXISTS public.add_member_by_email(UUID, TEXT, DECIMAL, TEXT);

-- Update add_member_by_email to support both modes
CREATE OR REPLACE FUNCTION public.add_member_by_email(
  p_unit_id UUID,
  p_email TEXT,
  p_contribution_type TEXT DEFAULT 'share',
  p_share_percentage DECIMAL DEFAULT NULL,
  p_fixed_amount DECIMAL DEFAULT NULL,
  p_role TEXT DEFAULT 'renter'
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
    RETURN jsonb_build_object('success', false, 'error', 'Only unit owners can add members');
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

  IF p_role NOT IN ('owner', 'renter') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  IF p_contribution_type = 'share' THEN
    IF p_share_percentage IS NULL OR p_share_percentage < 0 OR p_share_percentage > 100 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Share must be between 0 and 100');
    END IF;
    INSERT INTO unit_members (unit_id, user_id, role, contribution_type, share_percentage, fixed_amount)
    VALUES (p_unit_id, v_invitee_id, p_role, 'share', p_share_percentage, NULL);
  ELSIF p_contribution_type = 'fixed' THEN
    IF p_fixed_amount IS NULL OR p_fixed_amount < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Fixed amount must be 0 or more');
    END IF;
    INSERT INTO unit_members (unit_id, user_id, role, contribution_type, share_percentage, fixed_amount)
    VALUES (p_unit_id, v_invitee_id, p_role, 'fixed', NULL, p_fixed_amount);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Contribution type must be share or fixed');
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', v_invitee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT) TO service_role;

-- Update create_unit_and_join to use new columns (owner gets 100% share)
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

  INSERT INTO unit_members (unit_id, user_id, role, contribution_type, share_percentage, fixed_amount)
  VALUES (v_unit_id, v_user_id, 'owner', 'share', 100, NULL);

  RETURN QUERY SELECT u.id, u.name, u.address, u.monthly_rent, u.created_by, u.created_at, u.updated_at
  FROM units u WHERE u.id = v_unit_id;
END;
$$;
