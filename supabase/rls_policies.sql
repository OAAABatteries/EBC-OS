-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Role-Based RLS Policies
--  Eagles Brothers Constructors · Houston, TX
--
--  Run this AFTER disabling email confirmation in Supabase Dashboard
--  and after users have signed in at least once (auto-provisioned).
--
--  This replaces the temporary anon_full_access policies.
-- ═══════════════════════════════════════════════════════════════

-- Helper function: get the user's role from their JWT metadata
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'employee'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: check if current user is admin/owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('owner', 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
--  DROP old anon_full_access policies on all tables
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_full_access ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS auth_full_access ON public.%I', tbl);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
--  COMPANY — everyone can read, only owner/admin can modify
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_read" ON public.company FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_write" ON public.company FOR ALL TO authenticated USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

-- ═══════════════════════════════════════════════════════════════
--  USERS — everyone can read, only admin/owner can modify others
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_self_update" ON public.users FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());
CREATE POLICY "users_admin_write" ON public.users FOR ALL TO authenticated
  USING (public.is_admin_or_owner())
  WITH CHECK (public.is_admin_or_owner());

-- ═══════════════════════════════════════════════════════════════
--  SHARED TABLES — authenticated users can read/write
--  (bids, projects, contacts, etc.)
--  Owner/Admin/PM have full access; others read-only
-- ═══════════════════════════════════════════════════════════════

-- Macro: apply standard read/write policies to a table
-- All authenticated users can read; owner/admin/pm can write
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'bids', 'bid_attachments', 'projects', 'contacts', 'call_log',
    'assemblies', 'scope_items', 'takeoffs', 'takeoff_rooms', 'takeoff_items',
    'invoices', 'change_orders', 'tm_tickets', 'rfis', 'submittals',
    'schedule_tasks', 'daily_reports', 'jsas', 'equipment', 'equipment_bookings',
    'calendar_events', 'certifications', 'pto_requests', 'crew_schedule',
    'margin_tiers'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- Everyone authenticated can read
    EXECUTE format(
      'CREATE POLICY "%s_read" ON public.%I FOR SELECT TO authenticated USING (true)',
      tbl, tbl
    );

    -- Owner/Admin/PM can write (insert, update, delete)
    EXECUTE format(
      'CREATE POLICY "%s_write" ON public.%I FOR ALL TO authenticated USING (public.get_user_role() IN (''owner'', ''admin'', ''pm'', ''office_admin'', ''accounting'', ''safety'', ''foreman'')) WITH CHECK (public.get_user_role() IN (''owner'', ''admin'', ''pm'', ''office_admin'', ''accounting'', ''safety'', ''foreman''))',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
--  GRANT authenticated role access (required for RLS to work)
-- ═══════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Keep anon read-only for public-facing data (if needed later)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
