-- Contribution end date: when the co-tenant's contribution period ends
-- Set when adding a co-tenant with a fixed billing period (e.g. tenant moving out)

ALTER TABLE unit_members
  ADD COLUMN IF NOT EXISTS contribution_end_date DATE;

COMMENT ON COLUMN unit_members.contribution_end_date IS 'Optional end date for co-tenant contribution. When set, contribution stops after this date.';

-- Update add_member_by_email to accept contribution_end_date
DROP FUNCTION IF EXISTS public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.add_member_by_email(
  p_unit_id UUID,
  p_email TEXT,
  p_contribution_type TEXT DEFAULT 'share',
  p_share_percentage DECIMAL DEFAULT NULL,
  p_fixed_amount DECIMAL DEFAULT NULL,
  p_contribution_period TEXT DEFAULT 'monthly',
  p_role TEXT DEFAULT 'co_tenant',
  p_contribution_end_date DATE DEFAULT NULL
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
    INSERT INTO unit_members (unit_id, user_id, role, contribution_type, share_percentage, fixed_amount, contribution_period, contribution_end_date)
    VALUES (p_unit_id, v_invitee_id, 'co_tenant', 'share', p_share_percentage, NULL, NULL, p_contribution_end_date);
  ELSIF p_contribution_type = 'fixed' THEN
    IF p_fixed_amount IS NULL OR p_fixed_amount < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Fixed amount must be 0 or more');
    END IF;
    IF p_contribution_period NOT IN ('monthly', 'yearly') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Period must be monthly or yearly');
    END IF;
    INSERT INTO unit_members (unit_id, user_id, role, contribution_type, share_percentage, fixed_amount, contribution_period, contribution_end_date)
    VALUES (p_unit_id, v_invitee_id, 'co_tenant', 'fixed', NULL, p_fixed_amount, p_contribution_period, p_contribution_end_date);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Contribution type must be share or fixed');
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', v_invitee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_member_by_email(UUID, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, DATE) TO service_role;
