-- Add members to a unit by email (owner only)
-- Looks up user in auth.users and adds to unit_members
CREATE OR REPLACE FUNCTION public.add_member_by_email(
  p_unit_id UUID,
  p_email TEXT,
  p_share_percentage DECIMAL DEFAULT 50,
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

  -- Only unit owners can add members
  IF NOT public.is_unit_owner(p_unit_id, v_inviter_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only unit owners can add members');
  END IF;

  -- Look up user by email (auth.users)
  SELECT id INTO v_invitee_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF v_invitee_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No account found with that email. They need to sign up first.');
  END IF;

  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM unit_members WHERE unit_id = p_unit_id AND user_id = v_invitee_id
  ) INTO v_existing;

  IF v_existing THEN
    RETURN jsonb_build_object('success', false, 'error', 'This person is already a member');
  END IF;

  -- Validate role and share
  IF p_role NOT IN ('owner', 'renter') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;
  IF p_share_percentage < 0 OR p_share_percentage > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Share must be between 0 and 100');
  END IF;

  INSERT INTO unit_members (unit_id, user_id, role, share_percentage)
  VALUES (p_unit_id, v_invitee_id, p_role, p_share_percentage);

  RETURN jsonb_build_object('success', true, 'user_id', v_invitee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_member_by_email(UUID, TEXT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_member_by_email(UUID, TEXT, DECIMAL, TEXT) TO service_role;
