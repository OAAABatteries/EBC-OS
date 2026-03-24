---
name: supabase-migrate
description: Generate safe Supabase database migrations. Use when adding tables, changing columns, updating RLS policies, or when the user says "migrate", "add table", "schema change", "database update", "add column", or "fix RLS".
allowed-tools: Read, Grep, Glob, Write, Bash
---

# Supabase Migration Generator — EBC-OS

Generate safe, reviewable database migrations for the EBC-OS Supabase backend.

## Context

- Current schema: `supabase/schema.sql` (the source of truth)
- Supabase config: `src/lib/supabase.js` (client, auth helpers, storage, CRUD)
- App uses `useSyncedState` hook for localStorage + Supabase sync
- Tables use snake_case; app uses camelCase (conversion in supabase.js)
- Storage bucket: `ebc-files` (PDFs, drawings, attachments)
- Auth: Supabase Auth with email/password + localStorage fallback
- RLS: Currently has auth + anon policies on storage; tables need review

## Existing Tables (from schema.sql)

Read `supabase/schema.sql` to get the current state. Key tables include:
- `bids` — bid tracking (GC, project, status, amounts)
- `projects` — active project management
- `contacts` — GC contacts, subs, vendors
- `takeoffs` — estimating takeoff data
- `project_drawings` — PDF drawing metadata (links to storage)
- `change_orders` — CO tracking
- `daily_logs` — field reports
- `rfis` — request for information
- `submittals` — submittal tracking
- `invoices` — billing
- `safety_observations` — JSA/safety
- `teams` — team/crew management
- `timeclock_entries` — time tracking

## Migration Rules

### DO:
- Always read current schema.sql FIRST
- Use `IF NOT EXISTS` for CREATE TABLE
- Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for new columns
- Include `created_at TIMESTAMPTZ DEFAULT NOW()` on all tables
- Include `updated_at TIMESTAMPTZ DEFAULT NOW()` on all tables
- Add appropriate indexes for columns used in WHERE/JOIN/ORDER BY
- Add RLS policies that match the existing pattern
- Add comments explaining the purpose of each change
- Name migration files: `supabase/migrations/{YYYYMMDD}_{description}.sql`

### DON'T:
- Never DROP TABLE or DROP COLUMN without explicit user approval
- Never modify existing column types without a migration plan
- Never remove RLS policies
- Never hardcode user IDs or emails

## RLS Policy Pattern (from existing schema)

```sql
-- Authenticated users can do everything (single-company app)
CREATE POLICY "table_auth_select" ON public.table_name
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "table_auth_insert" ON public.table_name
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "table_auth_update" ON public.table_name
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "table_auth_delete" ON public.table_name
  FOR DELETE TO authenticated USING (true);

-- Anon fallback (for when auth session isn't established)
CREATE POLICY "table_anon_select" ON public.table_name
  FOR SELECT TO anon USING (true);
```

## Output Format

```sql
-- ═══════════════════════════════════════════════════════════
--  Migration: [description]
--  Date: [YYYY-MM-DD]
--  Purpose: [why this change is needed]
-- ═══════════════════════════════════════════════════════════

-- 1. Create new table (if applicable)
CREATE TABLE IF NOT EXISTS public.new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns here
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- 3. Add policies
CREATE POLICY "new_table_auth_all" ON public.new_table
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Add indexes
CREATE INDEX IF NOT EXISTS idx_new_table_field
  ON public.new_table(field_name);

-- 5. Enable realtime (if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE public.new_table;
```

## Workflow

1. Read `supabase/schema.sql` to understand current state
2. Understand the feature requirement
3. Design the schema change
4. Generate the migration SQL
5. Also update `supabase/schema.sql` to keep it current
6. If a new table needs app integration, note which `useSyncedState` calls need updating in `App.jsx`

Always present the migration for review before applying.
