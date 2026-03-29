-- ReimburseX Manager Backend Patch (for existing Supabase schema)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- 1) Users table alignment for custom auth
alter table if exists public.users add column if not exists password_hash text;
alter table if exists public.users add column if not exists manager_id uuid;
alter table if exists public.users add column if not exists department text;
alter table if exists public.users add column if not exists is_active boolean default true;

-- If this FK exists, it blocks custom-app signup inserts
alter table if exists public.users drop constraint if exists users_id_fkey;

create index if not exists idx_users_company_id on public.users(company_id);
create index if not exists idx_users_manager_id on public.users(manager_id);
create index if not exists idx_users_role on public.users(role);

-- Backfill employee -> manager mapping when missing (required for manager visibility)
with first_manager_per_company as (
  select distinct on (company_id) company_id, id as manager_id
  from public.users
  where role = 'manager'
  order by company_id, created_at asc nulls last, id asc
)
update public.users u
set manager_id = fm.manager_id
from first_manager_per_company fm
where u.role = 'employee'
  and u.company_id = fm.company_id
  and u.manager_id is null;

-- 2) Expenses table indexes for manager APIs
alter table if exists public.expenses add column if not exists rule_set_id uuid;
alter table if exists public.expenses add column if not exists receipt_url text;
alter table if exists public.expenses add column if not exists ocr_raw jsonb;
alter table if exists public.expenses add column if not exists current_step integer;
alter table if exists public.expenses add column if not exists date date;
alter table if exists public.expenses add column if not exists submitted_at timestamptz;
alter table if exists public.expenses add column if not exists resolved_at timestamptz;
alter table if exists public.expenses add column if not exists created_at timestamptz;

update public.expenses
set submitted_at = coalesce(submitted_at, now()),
    created_at = coalesce(created_at, now()),
    current_step = coalesce(current_step, 1),
    ocr_raw = coalesce(ocr_raw, '{}'::jsonb)
where submitted_at is null
   or created_at is null
   or current_step is null
   or ocr_raw is null;

create index if not exists idx_expenses_company_id on public.expenses(company_id);
create index if not exists idx_expenses_employee_id on public.expenses(employee_id);
create index if not exists idx_expenses_status on public.expenses(status);
create index if not exists idx_expenses_submitted_at on public.expenses(submitted_at desc);

-- 2.1) Request audit/event history (every request action)
create table if not exists public.expense_request_logs (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_role text,
  event_type text not null,
  status_before text,
  status_after text,
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_request_logs_expense on public.expense_request_logs(expense_id, created_at desc);
create index if not exists idx_request_logs_actor on public.expense_request_logs(actor_user_id, created_at desc);
create index if not exists idx_request_logs_event on public.expense_request_logs(event_type, created_at desc);

-- 3) Ensure default approval rules exist (compatible with bigint company_id setup)
insert into public.approval_rules (company_id, escalate_after_days, min_approvals)
select 1, 3, 1
where not exists (select 1 from public.approval_rules);

-- 4) Seed/align users with bcrypt password hashes used by backend login
-- admin123
-- manager123
-- employee123
with first_company as (
  select id from public.companies order by created_at asc limit 1
),
upsert_admin as (
  insert into public.users (id, company_id, name, email, role, password_hash, is_active)
  select gen_random_uuid(), fc.id, 'Nisha Admin', 'admin@reimbursex.com', 'admin', '$2a$10$IXNpHK2RlGu6AzggGRSK2.KGyjqwok7QhEgUvBFo36rC8F9gVesCa', true
  from first_company fc
  on conflict (email) do update
    set company_id = excluded.company_id,
        name = excluded.name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        is_active = true
  returning id, company_id
),
upsert_manager as (
  insert into public.users (id, company_id, name, email, role, password_hash, is_active)
  select gen_random_uuid(), fc.id, 'Rohit Manager', 'manager@reimbursex.com', 'manager', '$2a$10$0YQsyUbVKalNnRPMZXus8.1u7irXdM5dbSZw2N7jU38epWgADvbeu', true
  from first_company fc
  on conflict (email) do update
    set company_id = excluded.company_id,
        name = excluded.name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        is_active = true
  returning id, company_id
)
insert into public.users (id, company_id, manager_id, name, email, role, password_hash, is_active)
select gen_random_uuid(), um.company_id, um.id, 'Anu Employee', 'employee@reimbursex.com', 'employee', '$2a$10$XxtdmZAsi.HHEu94n347wuIfo5e12Ft1ffpUpgfdgKPVqOgzHTm5q', true
from upsert_manager um
on conflict (email) do update
  set company_id = excluded.company_id,
      manager_id = excluded.manager_id,
      name = excluded.name,
      role = excluded.role,
      password_hash = excluded.password_hash,
      is_active = true;

-- 5) Optional sample expenses for manager dashboard (insert only when table is empty)
with m as (
  select id as manager_id, company_id from public.users where email = 'manager@reimbursex.com' limit 1
),
e as (
  select id as employee_id, name as employee_name, company_id, manager_id from public.users where email = 'employee@reimbursex.com' limit 1
)
insert into public.expenses
  (id, company_id, employee_id, category, description, amount, currency_code, amount_usd, status, date, submitted_at, created_at)
select
  gen_random_uuid(),
  coalesce(e.company_id, m.company_id),
  e.employee_id,
  x.category,
  x.description,
  x.amount,
  'INR',
  x.amount_usd,
  x.status,
  current_date - x.days_ago,
  now() - (x.days_ago || ' days')::interval,
  now()
from m, e,
(
  values
    ('travel', 'Client site taxi', 3500.00::numeric, 42.00::numeric, 'pending', 1),
    ('food', 'Team lunch', 1800.00::numeric, 21.00::numeric, 'pending', 2),
    ('misc', 'Stationery', 900.00::numeric, 11.00::numeric, 'approved', 4)
) as x(category, description, amount, amount_usd, status, days_ago)
where not exists (select 1 from public.expenses);
