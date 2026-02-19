-- Fix: "new row violates row-level security policy for table units"
-- Use a SECURITY DEFINER function to create units + add creator as owner in one transaction.
-- This bypasses RLS for the initial unit creation (creator isn't a member yet).

-- Drop and recreate the INSERT policy to be more permissive (fallback)
DROP POLICY IF EXISTS "Authenticated users can create units" ON units;

-- Allow any authenticated user to insert units (created_by can be self or null)
CREATE POLICY "Authenticated users can create units" ON units FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by IS NULL OR created_by = auth.uid())
  );

-- Alternative: use a function for atomic unit creation (recommended)
-- Call: SELECT * FROM create_unit_and_join('Unit Name', 'Address', 1500);
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

  INSERT INTO unit_members (unit_id, user_id, role, share_percentage)
  VALUES (v_unit_id, v_user_id, 'owner', 100);

  RETURN QUERY SELECT u.id, u.name, u.address, u.monthly_rent, u.created_by, u.created_at, u.updated_at
  FROM units u WHERE u.id = v_unit_id;
END;
$$;

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.create_unit_and_join(TEXT, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_unit_and_join(TEXT, TEXT, DECIMAL) TO service_role;
