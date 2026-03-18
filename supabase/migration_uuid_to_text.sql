-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Migration: UUID → TEXT for all ID columns
--  Allows seed data with integer/string IDs to sync properly
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Drop ALL foreign key constraints first
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint
    WHERE contype = 'f'
    AND conrelid::regclass::text IN (
      'bids','projects','contacts','call_log','invoices','change_orders',
      'rfis','submittals','schedule_tasks','takeoffs','takeoff_rooms','takeoff_items',
      'daily_reports','jsas','users','time_entries','material_requests','crew_schedule',
      'company','assemblies','calendar_events','pto_requests','equipment',
      'equipment_bookings','certifications','company_locations','incidents',
      'toolbox_talks','scope_items','materials','custom_assemblies',
      'incentive_projects','bid_attachments','tm_tickets','margin_tiers'
    )
  ) LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.table_name, r.conname);
  END LOOP;
END $$;

-- Step 2: Also drop the auth.users FK on users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_id_fkey;

-- Step 3: Change all id columns and FK reference columns from UUID to TEXT
-- Primary keys
ALTER TABLE company ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE users ALTER COLUMN auth_id TYPE TEXT USING auth_id::TEXT;
ALTER TABLE margin_tiers ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE contacts ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE bids ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE bid_attachments ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE projects ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE call_log ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE assemblies ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE scope_items ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE takeoffs ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE takeoff_rooms ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE takeoff_items ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE invoices ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE change_orders ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE tm_tickets ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE rfis ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE submittals ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE schedule_tasks ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE daily_reports ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE jsas ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE equipment ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE equipment_bookings ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE calendar_events ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE certifications ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE pto_requests ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE crew_schedule ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE time_entries ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE material_requests ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE incidents ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE toolbox_talks ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE company_locations ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE materials ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE custom_assemblies ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE incentive_projects ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Foreign key columns (UUID → TEXT)
ALTER TABLE bid_attachments ALTER COLUMN bid_id TYPE TEXT USING bid_id::TEXT;
ALTER TABLE projects ALTER COLUMN bid_id TYPE TEXT USING bid_id::TEXT;
ALTER TABLE takeoffs ALTER COLUMN bid_id TYPE TEXT USING bid_id::TEXT;
ALTER TABLE takeoff_rooms ALTER COLUMN takeoff_id TYPE TEXT USING takeoff_id::TEXT;
ALTER TABLE takeoff_items ALTER COLUMN room_id TYPE TEXT USING room_id::TEXT;
ALTER TABLE invoices ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE change_orders ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE tm_tickets ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE rfis ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE submittals ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE schedule_tasks ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE daily_reports ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE jsas ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE equipment_bookings ALTER COLUMN equipment_id TYPE TEXT USING equipment_id::TEXT;
ALTER TABLE equipment_bookings ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE calendar_events ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE certifications ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;
ALTER TABLE pto_requests ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;
ALTER TABLE crew_schedule ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;
ALTER TABLE crew_schedule ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE time_entries ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;
ALTER TABLE time_entries ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE material_requests ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE material_requests ALTER COLUMN requested_by_id TYPE TEXT USING requested_by_id::TEXT;
ALTER TABLE incidents ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE toolbox_talks ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
ALTER TABLE incentive_projects ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;

-- Step 4: Set default to empty string instead of uuid_generate_v4() for id columns
-- (the app generates its own IDs)
ALTER TABLE company ALTER COLUMN id SET DEFAULT '';
ALTER TABLE users ALTER COLUMN id SET DEFAULT '';
ALTER TABLE margin_tiers ALTER COLUMN id SET DEFAULT '';
ALTER TABLE contacts ALTER COLUMN id SET DEFAULT '';
ALTER TABLE bids ALTER COLUMN id SET DEFAULT '';
ALTER TABLE bid_attachments ALTER COLUMN id SET DEFAULT '';
ALTER TABLE projects ALTER COLUMN id SET DEFAULT '';
ALTER TABLE call_log ALTER COLUMN id SET DEFAULT '';
ALTER TABLE assemblies ALTER COLUMN id SET DEFAULT '';
ALTER TABLE scope_items ALTER COLUMN id SET DEFAULT '';
ALTER TABLE takeoffs ALTER COLUMN id SET DEFAULT '';
ALTER TABLE takeoff_rooms ALTER COLUMN id SET DEFAULT '';
ALTER TABLE takeoff_items ALTER COLUMN id SET DEFAULT '';
ALTER TABLE invoices ALTER COLUMN id SET DEFAULT '';
ALTER TABLE change_orders ALTER COLUMN id SET DEFAULT '';
ALTER TABLE tm_tickets ALTER COLUMN id SET DEFAULT '';
ALTER TABLE rfis ALTER COLUMN id SET DEFAULT '';
ALTER TABLE submittals ALTER COLUMN id SET DEFAULT '';
ALTER TABLE schedule_tasks ALTER COLUMN id SET DEFAULT '';
ALTER TABLE daily_reports ALTER COLUMN id SET DEFAULT '';
ALTER TABLE jsas ALTER COLUMN id SET DEFAULT '';
ALTER TABLE equipment ALTER COLUMN id SET DEFAULT '';
ALTER TABLE equipment_bookings ALTER COLUMN id SET DEFAULT '';
ALTER TABLE calendar_events ALTER COLUMN id SET DEFAULT '';
ALTER TABLE certifications ALTER COLUMN id SET DEFAULT '';
ALTER TABLE pto_requests ALTER COLUMN id SET DEFAULT '';
ALTER TABLE crew_schedule ALTER COLUMN id SET DEFAULT '';
ALTER TABLE time_entries ALTER COLUMN id SET DEFAULT '';
ALTER TABLE material_requests ALTER COLUMN id SET DEFAULT '';
ALTER TABLE incidents ALTER COLUMN id SET DEFAULT '';
ALTER TABLE toolbox_talks ALTER COLUMN id SET DEFAULT '';
ALTER TABLE company_locations ALTER COLUMN id SET DEFAULT '';
ALTER TABLE materials ALTER COLUMN id SET DEFAULT '';
ALTER TABLE custom_assemblies ALTER COLUMN id SET DEFAULT '';
ALTER TABLE incentive_projects ALTER COLUMN id SET DEFAULT '';
