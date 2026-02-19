-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units (properties)
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  monthly_rent DECIMAL(12, 2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unit members (junction: user + unit + role + share)
CREATE TABLE unit_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'renter')),
  share_percentage DECIMAL(5, 2) NOT NULL DEFAULT 50 CHECK (share_percentage >= 0 AND share_percentage <= 100),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, user_id)
);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('rent', 'pub', 'cleaning', 'provisions', 'other')),
  amount DECIMAL(12, 2) NOT NULL,
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contributions (one-time extra contributions)
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_collected', 'collected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contribution payments
CREATE TABLE contribution_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contribution_id UUID NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contribution_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_payments ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Units: members can view
CREATE POLICY "Unit members can view units" ON units FOR SELECT
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = units.id AND user_id = auth.uid()));

CREATE POLICY "Authenticated users can create units" ON units FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Unit owners can update units" ON units FOR UPDATE
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = units.id AND user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "Unit owners can delete units" ON units FOR DELETE
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = units.id AND user_id = auth.uid() AND role = 'owner'));

-- Unit members: members can view members of their units
CREATE POLICY "Unit members can view unit_members" ON unit_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM unit_members um WHERE um.unit_id = unit_members.unit_id AND um.user_id = auth.uid()));

CREATE POLICY "Unit owners can insert members" ON unit_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM unit_members WHERE unit_id = unit_members.unit_id AND user_id = auth.uid() AND role = 'owner')
  OR (user_id = auth.uid())
);

CREATE POLICY "Unit owners can update members" ON unit_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = unit_members.unit_id AND user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "Unit owners or self can delete members" ON unit_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM unit_members WHERE unit_id = unit_members.unit_id AND user_id = auth.uid() AND role = 'owner')
    OR user_id = auth.uid()
  );

-- Expenses: unit members can CRUD
CREATE POLICY "Unit members can view expenses" ON expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = expenses.unit_id AND user_id = auth.uid()));

CREATE POLICY "Unit members can insert expenses" ON expenses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM unit_members WHERE unit_id = expenses.unit_id AND user_id = auth.uid())
);

CREATE POLICY "Unit members can update expenses" ON expenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = expenses.unit_id AND user_id = auth.uid()));

CREATE POLICY "Unit members can delete expenses" ON expenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = expenses.unit_id AND user_id = auth.uid()));

-- Contributions: unit members can CRUD
CREATE POLICY "Unit members can view contributions" ON contributions FOR SELECT
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = contributions.unit_id AND user_id = auth.uid()));

CREATE POLICY "Unit members can insert contributions" ON contributions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM unit_members WHERE unit_id = contributions.unit_id AND user_id = auth.uid())
);

CREATE POLICY "Unit members can update contributions" ON contributions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = contributions.unit_id AND user_id = auth.uid()));

CREATE POLICY "Unit members can delete contributions" ON contributions FOR DELETE
  USING (EXISTS (SELECT 1 FROM unit_members WHERE unit_id = contributions.unit_id AND user_id = auth.uid()));

-- Contribution payments: unit members can CRUD
CREATE POLICY "Unit members can view contribution_payments" ON contribution_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contributions c
    JOIN unit_members um ON um.unit_id = c.unit_id
    WHERE c.id = contribution_payments.contribution_id AND um.user_id = auth.uid()
  ));

CREATE POLICY "Unit members can insert contribution_payments" ON contribution_payments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM contributions c
    JOIN unit_members um ON um.unit_id = c.unit_id
    WHERE c.id = contribution_payments.contribution_id AND um.user_id = auth.uid()
  )
);

-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable Realtime for expenses (run in Supabase dashboard if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
