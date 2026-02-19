-- Allow unit members to view profiles of other members in the same unit
-- (so master tenant and co-tenant names are visible to all unit members)
CREATE POLICY "Unit members can view co-members profiles" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM unit_members um1
      JOIN unit_members um2 ON um1.unit_id = um2.unit_id AND um2.user_id = profiles.id
      WHERE um1.user_id = auth.uid()
    )
  );
