-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Phase 3 Completion — Materials, Custom Assemblies, Incentives
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS materials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL DEFAULT '',
  category    TEXT DEFAULT '',
  unit        TEXT DEFAULT 'EA',
  unit_cost   NUMERIC(12,2) DEFAULT 0,
  supplier    TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_assemblies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT DEFAULT '',
  name        TEXT NOT NULL DEFAULT '',
  unit        TEXT DEFAULT 'SF',
  material    NUMERIC(12,2) DEFAULT 0,
  labor       NUMERIC(12,2) DEFAULT 0,
  items       JSONB DEFAULT '[]',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incentive_projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  name          TEXT DEFAULT '',
  budget_hours  NUMERIC(10,2) DEFAULT 0,
  actual_hours  NUMERIC(10,2) DEFAULT 0,
  bonus_pool    NUMERIC(12,2) DEFAULT 0,
  status        TEXT DEFAULT 'active',
  workers       JSONB DEFAULT '[]',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS + policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN VALUES ('materials'), ('custom_assemblies'), ('incentive_projects')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_full_access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_read" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "auth_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t
    );
    EXECUTE format(
      'CREATE POLICY "anon_read" ON %I FOR SELECT TO anon USING (true)', t
    );
  END LOOP;
END;
$$;

-- Auto-update updated_at triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN VALUES ('materials'), ('custom_assemblies'), ('incentive_projects')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t
    );
  END LOOP;
END;
$$;

GRANT ALL ON materials TO authenticated;
GRANT ALL ON custom_assemblies TO authenticated;
GRANT ALL ON incentive_projects TO authenticated;
GRANT SELECT ON materials TO anon;
GRANT SELECT ON custom_assemblies TO anon;
GRANT SELECT ON incentive_projects TO anon;

-- ═══════════════════════════════════════════════════════════════
--  DONE! Phase 3 completion tables are ready.
-- ═══════════════════════════════════════════════════════════════
