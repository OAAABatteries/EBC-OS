-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Supabase Database Schema
--  Eagles Brothers Constructors · Houston, TX
--  Run this in the Supabase SQL Editor to create all tables.
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ═════════════════════════════════════════════════════════════
--  COMPANY
-- ═════════════════════════════════════════════════════════════

create table if not exists company (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null default '',
  address      text default '',
  phone        text default '',
  email        text default '',
  license      text default '',
  logo_url     text default '',
  tax_rate     numeric(5,2) default 8.25,
  waste_pct    numeric(5,2) default 5.0,
  overhead_pct numeric(5,2) default 10.0,
  profit_pct   numeric(5,2) default 10.0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ═════════════════════════════════════════════════════════════
--  USERS (profiles linked to auth.users)
-- ═════════════════════════════════════════════════════════════

create table if not exists users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique not null,
  name         text not null default '',
  role         text not null default 'employee',
  pin          text default '',
  phone        text default '',
  title        text default '',
  avatar_url   text default '',
  company_id   uuid references company(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_users_company on users(company_id);
create index if not exists idx_users_role on users(role);

-- ═════════════════════════════════════════════════════════════
--  BIDS
-- ═════════════════════════════════════════════════════════════

create table if not exists bids (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  name         text not null default '',
  gc           text default '',
  value        numeric(14,2) default 0,
  due          date,
  status       text default 'estimating',
  scope        text default '',
  phase        text default '',
  risk         text default 'Low',
  notes        text default '',
  contact      text default '',
  month        text default '',
  close_out    text default '',
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_bids_company on bids(company_id);
create index if not exists idx_bids_status on bids(status);
create index if not exists idx_bids_created_by on bids(created_by);
create index if not exists idx_bids_due on bids(due);

-- ═════════════════════════════════════════════════════════════
--  BID ATTACHMENTS
-- ═════════════════════════════════════════════════════════════

create table if not exists bid_attachments (
  id           uuid primary key default uuid_generate_v4(),
  bid_id       uuid references bids(id) on delete cascade not null,
  name         text not null default '',
  type         text default '',
  size         bigint default 0,
  storage_path text not null default '',
  uploaded_by  uuid references users(id) on delete set null,
  uploaded_at  timestamptz default now()
);

create index if not exists idx_bid_attachments_bid on bid_attachments(bid_id);

-- ═════════════════════════════════════════════════════════════
--  PROJECTS
-- ═════════════════════════════════════════════════════════════

create table if not exists projects (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  name         text not null default '',
  gc           text default '',
  contract     numeric(14,2) default 0,
  billed       numeric(14,2) default 0,
  progress     numeric(5,2) default 0,
  phase        text default '',
  start_date   date,
  end_date     date,
  status       text default 'active',
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_projects_company on projects(company_id);
create index if not exists idx_projects_status on projects(status);

-- ═════════════════════════════════════════════════════════════
--  CONTACTS
-- ═════════════════════════════════════════════════════════════

create table if not exists contacts (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  name         text not null default '',
  company_name text default '',
  role         text default '',
  phone        text default '',
  email        text default '',
  priority     text default 'med',
  notes        text default '',
  bids_count   int default 0,
  wins_count   int default 0,
  color        text default '',
  created_at   timestamptz default now()
);

create index if not exists idx_contacts_company on contacts(company_id);

-- ═════════════════════════════════════════════════════════════
--  CALL LOG
-- ═════════════════════════════════════════════════════════════

create table if not exists call_log (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  contact_id   uuid references contacts(id) on delete cascade,
  note         text default '',
  next_step    text default '',
  time         timestamptz default now(),
  logged_by    uuid references users(id) on delete set null
);

create index if not exists idx_call_log_contact on call_log(contact_id);

-- ═════════════════════════════════════════════════════════════
--  TAKEOFFS
-- ═════════════════════════════════════════════════════════════

create table if not exists takeoffs (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  bid_id       uuid references bids(id) on delete set null,
  name         text not null default '',
  created_at   timestamptz default now(),
  updated_by   uuid references users(id) on delete set null
);

create index if not exists idx_takeoffs_bid on takeoffs(bid_id);

create table if not exists takeoff_rooms (
  id           uuid primary key default uuid_generate_v4(),
  takeoff_id   uuid references takeoffs(id) on delete cascade not null,
  name         text not null default '',
  sort_order   int default 0
);

create index if not exists idx_takeoff_rooms_takeoff on takeoff_rooms(takeoff_id);

create table if not exists takeoff_items (
  id             uuid primary key default uuid_generate_v4(),
  room_id        uuid references takeoff_rooms(id) on delete cascade not null,
  assembly_code  text default '',
  description    text default '',
  quantity       numeric(12,2) default 0,
  unit           text default 'LF',
  mat_rate       numeric(10,2) default 0,
  lab_rate       numeric(10,2) default 0,
  notes          text default ''
);

create index if not exists idx_takeoff_items_room on takeoff_items(room_id);

-- ═════════════════════════════════════════════════════════════
--  INVOICES
-- ═════════════════════════════════════════════════════════════

create table if not exists invoices (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  project_id   uuid references projects(id) on delete cascade,
  number       text default '',
  date         date,
  amount       numeric(14,2) default 0,
  status       text default 'draft',
  paid_date    date,
  description  text default '',
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists idx_invoices_project on invoices(project_id);
create index if not exists idx_invoices_status on invoices(status);

-- ═════════════════════════════════════════════════════════════
--  CHANGE ORDERS
-- ═════════════════════════════════════════════════════════════

create table if not exists change_orders (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  project_id   uuid references projects(id) on delete cascade,
  number       text default '',
  description  text default '',
  amount       numeric(14,2) default 0,
  status       text default 'pending',
  date         date,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists idx_change_orders_project on change_orders(project_id);

-- ═════════════════════════════════════════════════════════════
--  T&M TICKETS
-- ═════════════════════════════════════════════════════════════

create table if not exists tm_tickets (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  project_id   uuid references projects(id) on delete cascade,
  number       text default '',
  date         date,
  description  text default '',
  labor_hours  numeric(8,2) default 0,
  labor_rate   numeric(10,2) default 0,
  materials    numeric(12,2) default 0,
  status       text default 'open',
  approved_by  text default '',
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists idx_tm_tickets_project on tm_tickets(project_id);

-- ═════════════════════════════════════════════════════════════
--  RFIs
-- ═════════════════════════════════════════════════════════════

create table if not exists rfis (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid references company(id) on delete cascade,
  project_id     uuid references projects(id) on delete cascade,
  number         text default '',
  subject        text default '',
  question       text default '',
  answer         text default '',
  status         text default 'open',
  date_sent      date,
  date_received  date,
  from_name      text default '',
  to_name        text default '',
  created_by     uuid references users(id) on delete set null,
  created_at     timestamptz default now()
);

create index if not exists idx_rfis_project on rfis(project_id);

-- ═════════════════════════════════════════════════════════════
--  SUBMITTALS
-- ═════════════════════════════════════════════════════════════

create table if not exists submittals (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid references company(id) on delete cascade,
  project_id      uuid references projects(id) on delete cascade,
  number          text default '',
  spec_section    text default '',
  description     text default '',
  status          text default 'pending',
  submitted_date  date,
  due_date        date,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz default now()
);

create index if not exists idx_submittals_project on submittals(project_id);

-- ═════════════════════════════════════════════════════════════
--  SCHEDULE TASKS
-- ═════════════════════════════════════════════════════════════

create table if not exists schedule_tasks (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid references company(id) on delete cascade,
  project_id      uuid references projects(id) on delete cascade,
  name            text not null default '',
  start_date      date,
  end_date        date,
  crew            text default '',
  status          text default 'pending',
  predecessor_id  uuid references schedule_tasks(id) on delete set null,
  is_milestone    boolean default false,
  created_at      timestamptz default now()
);

create index if not exists idx_schedule_tasks_project on schedule_tasks(project_id);

-- ═════════════════════════════════════════════════════════════
--  DAILY REPORTS
-- ═════════════════════════════════════════════════════════════

create table if not exists daily_reports (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid references company(id) on delete cascade,
  project_id      uuid references projects(id) on delete cascade,
  date            date,
  weather         text default '',
  temp            text default '',
  crew_count      int default 0,
  work_performed  text default '',
  issues          text default '',
  photos          jsonb default '[]'::jsonb,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz default now()
);

create index if not exists idx_daily_reports_project on daily_reports(project_id);
create index if not exists idx_daily_reports_date on daily_reports(date);

-- ═════════════════════════════════════════════════════════════
--  JSAs (Job Safety Analysis)
-- ═════════════════════════════════════════════════════════════

create table if not exists jsas (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid references company(id) on delete cascade,
  project_id      uuid references projects(id) on delete set null,
  date            date,
  location        text default '',
  gc              text default '',
  environment     text default '',
  scope           text default '',
  hazards         jsonb default '[]'::jsonb,
  crew_members    jsonb default '[]'::jsonb,
  signatures      jsonb default '[]'::jsonb,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz default now()
);

create index if not exists idx_jsas_project on jsas(project_id);
create index if not exists idx_jsas_date on jsas(date);

-- ═════════════════════════════════════════════════════════════
--  EQUIPMENT
-- ═════════════════════════════════════════════════════════════

create table if not exists equipment (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid references company(id) on delete cascade,
  name                text not null default '',
  type                text default '',
  daily_rate          numeric(10,2) default 0,
  weekly_rate         numeric(10,2) default 0,
  monthly_rate        numeric(10,2) default 0,
  status              text default 'available',
  assigned_project_id uuid references projects(id) on delete set null,
  notes               text default '',
  created_at          timestamptz default now()
);

create index if not exists idx_equipment_company on equipment(company_id);
create index if not exists idx_equipment_status on equipment(status);

-- ═════════════════════════════════════════════════════════════
--  ASSEMBLIES (estimating library)
-- ═════════════════════════════════════════════════════════════

create table if not exists assemblies (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  code         text not null default '',
  name         text not null default '',
  category     text default '',
  unit         text default 'LF',
  description  text default '',
  components   jsonb default '[]'::jsonb,
  notes        text default '',
  is_custom    boolean default false,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists idx_assemblies_company on assemblies(company_id);
create index if not exists idx_assemblies_code on assemblies(code);

-- ═════════════════════════════════════════════════════════════
--  MARGIN TIERS
-- ═════════════════════════════════════════════════════════════

create table if not exists margin_tiers (
  id       uuid primary key default uuid_generate_v4(),
  company_id uuid references company(id) on delete cascade,
  bronze   numeric(5,2) default 15.0,
  silver   numeric(5,2) default 20.0,
  gold     numeric(5,2) default 25.0,
  platinum numeric(5,2) default 30.0
);

-- ═════════════════════════════════════════════════════════════
--  SCOPE ITEMS
-- ═════════════════════════════════════════════════════════════

create table if not exists scope_items (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references company(id) on delete cascade,
  bid_id       uuid references bids(id) on delete set null,
  category     text default '',
  item         text default '',
  checked      boolean default false,
  flagged      boolean default false,
  notes        text default ''
);

create index if not exists idx_scope_items_bid on scope_items(bid_id);

-- ═════════════════════════════════════════════════════════════
--  UPDATED_AT TRIGGER (auto-update timestamps)
-- ═════════════════════════════════════════════════════════════

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to tables with updated_at
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'company', 'users', 'bids', 'projects'
  ]) loop
    execute format(
      'create trigger set_updated_at before update on %I
       for each row execute function update_updated_at()', t
    );
  end loop;
exception when duplicate_object then null;
end;
$$;

-- ═════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
--  Users can only access rows belonging to their company.
-- ═════════════════════════════════════════════════════════════

-- Helper: get the company_id for the currently authenticated user
create or replace function auth_company_id()
returns uuid as $$
  select company_id from users where id = auth.uid();
$$ language sql security definer stable;

-- Enable RLS on all tables and create policies
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'users', 'bids', 'bid_attachments', 'projects', 'contacts', 'call_log',
    'takeoffs', 'takeoff_rooms', 'takeoff_items',
    'invoices', 'change_orders', 'tm_tickets', 'rfis', 'submittals',
    'schedule_tasks', 'daily_reports', 'jsas', 'equipment',
    'assemblies', 'margin_tiers', 'scope_items', 'company'
  ]) loop
    execute format('alter table %I enable row level security', t);
  end loop;
end;
$$;

-- Company: members can read/update their own company
create policy "company_select" on company for select using (id = auth_company_id());
create policy "company_update" on company for update using (id = auth_company_id());

-- Users: same company
create policy "users_select" on users for select using (company_id = auth_company_id());
create policy "users_insert" on users for insert with check (company_id = auth_company_id());
create policy "users_update" on users for update using (company_id = auth_company_id());

-- Macro for company-scoped tables (most tables)
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'bids', 'projects', 'contacts', 'call_log', 'takeoffs',
    'invoices', 'change_orders', 'tm_tickets', 'rfis', 'submittals',
    'schedule_tasks', 'daily_reports', 'jsas', 'equipment',
    'assemblies', 'margin_tiers', 'scope_items'
  ]) loop
    execute format(
      'create policy %I on %I for select using (company_id = auth_company_id())',
      t || '_select', t
    );
    execute format(
      'create policy %I on %I for insert with check (company_id = auth_company_id())',
      t || '_insert', t
    );
    execute format(
      'create policy %I on %I for update using (company_id = auth_company_id())',
      t || '_update', t
    );
    execute format(
      'create policy %I on %I for delete using (company_id = auth_company_id())',
      t || '_delete', t
    );
  end loop;
end;
$$;

-- Bid attachments: access via parent bid's company
create policy "bid_attachments_select" on bid_attachments
  for select using (
    exists (select 1 from bids where bids.id = bid_attachments.bid_id and bids.company_id = auth_company_id())
  );
create policy "bid_attachments_insert" on bid_attachments
  for insert with check (
    exists (select 1 from bids where bids.id = bid_attachments.bid_id and bids.company_id = auth_company_id())
  );
create policy "bid_attachments_delete" on bid_attachments
  for delete using (
    exists (select 1 from bids where bids.id = bid_attachments.bid_id and bids.company_id = auth_company_id())
  );

-- Takeoff rooms: access via parent takeoff's company
create policy "takeoff_rooms_select" on takeoff_rooms
  for select using (
    exists (select 1 from takeoffs where takeoffs.id = takeoff_rooms.takeoff_id and takeoffs.company_id = auth_company_id())
  );
create policy "takeoff_rooms_insert" on takeoff_rooms
  for insert with check (
    exists (select 1 from takeoffs where takeoffs.id = takeoff_rooms.takeoff_id and takeoffs.company_id = auth_company_id())
  );
create policy "takeoff_rooms_update" on takeoff_rooms
  for update using (
    exists (select 1 from takeoffs where takeoffs.id = takeoff_rooms.takeoff_id and takeoffs.company_id = auth_company_id())
  );
create policy "takeoff_rooms_delete" on takeoff_rooms
  for delete using (
    exists (select 1 from takeoffs where takeoffs.id = takeoff_rooms.takeoff_id and takeoffs.company_id = auth_company_id())
  );

-- Takeoff items: access via parent room -> takeoff's company
create policy "takeoff_items_select" on takeoff_items
  for select using (
    exists (
      select 1 from takeoff_rooms r
      join takeoffs t on t.id = r.takeoff_id
      where r.id = takeoff_items.room_id and t.company_id = auth_company_id()
    )
  );
create policy "takeoff_items_insert" on takeoff_items
  for insert with check (
    exists (
      select 1 from takeoff_rooms r
      join takeoffs t on t.id = r.takeoff_id
      where r.id = takeoff_items.room_id and t.company_id = auth_company_id()
    )
  );
create policy "takeoff_items_update" on takeoff_items
  for update using (
    exists (
      select 1 from takeoff_rooms r
      join takeoffs t on t.id = r.takeoff_id
      where r.id = takeoff_items.room_id and t.company_id = auth_company_id()
    )
  );
create policy "takeoff_items_delete" on takeoff_items
  for delete using (
    exists (
      select 1 from takeoff_rooms r
      join takeoffs t on t.id = r.takeoff_id
      where r.id = takeoff_items.room_id and t.company_id = auth_company_id()
    )
  );

-- ═════════════════════════════════════════════════════════════
--  STORAGE BUCKET
-- ═════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('ebc-files', 'ebc-files', false)
on conflict (id) do nothing;

-- Storage policy: authenticated users can upload/read/delete their own files
create policy "ebc_files_select" on storage.objects
  for select using (bucket_id = 'ebc-files' and auth.role() = 'authenticated');

create policy "ebc_files_insert" on storage.objects
  for insert with check (bucket_id = 'ebc-files' and auth.role() = 'authenticated');

create policy "ebc_files_delete" on storage.objects
  for delete using (bucket_id = 'ebc-files' and auth.role() = 'authenticated');
