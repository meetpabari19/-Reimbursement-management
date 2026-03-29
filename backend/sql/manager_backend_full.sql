-- ReimburseX Full Backend SQL (Auth + Manager Role)
-- Run this script once in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1) companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  currency_code text not null default 'INR',
  created_at timestamptz not null default now()
);

-- 2) users (custom app auth, not Supabase Auth FK)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'manager', 'employee')),
  manager_id uuid references public.users(id) on delete set null,
  department text,
  is_active boolean default true,
  password_hash text,
  created_at timestamptz default now()
);

-- Remove conflicting FK if it exists from prior setup
alter table public.users drop constraint if exists users_id_fkey;

-- 3) approval_rules (one active row per company recommended)
create table if not exists public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  escalate_after_days int not null default 3 check (escalate_after_days >= 1),
  min_approvals int not null default 1 check (min_approvals >= 1),
  created_at timestamptz not null default now()
);

-- 4) expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.users(id) on delete cascade,
  manager_id uuid references public.users(id) on delete set null,
  rule_set_id uuid references public.approval_rules(id) on delete set null,
  employee_name text,
  description text not null,
  category text not null check (category in ('food', 'travel', 'misc', 'other')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'escalated')),
  date date,
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  amount numeric(12,2) not null default 0,
  amount_usd numeric(12,2) not null default 0,
  currency_code text not null default 'USD',
  receipt_url text,
  ocr_raw jsonb not null default '{}'::jsonb,
  current_step int not null default 1
);

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

-- Helpful indexes
create index if not exists idx_users_company on public.users(company_id);
create index if not exists idx_users_manager on public.users(manager_id);
create index if not exists idx_expenses_manager on public.expenses(manager_id);
create index if not exists idx_expenses_company on public.expenses(company_id);
create index if not exists idx_expenses_status on public.expenses(status);
create index if not exists idx_expenses_submitted on public.expenses(submitted_at desc);
create index if not exists idx_approval_rules_company on public.approval_rules(company_id);
create index if not exists idx_request_logs_expense on public.expense_request_logs(expense_id, created_at desc);
create index if not exists idx_request_logs_actor on public.expense_request_logs(actor_user_id, created_at desc);
create index if not exists idx_request_logs_event on public.expense_request_logs(event_type, created_at desc);

-- Optional seed block (safe to run multiple times)
insert into public.companies (name, country, currency_code)
select 'ReimburseX Labs', 'India', 'INR'
where not exists (select 1 from public.companies);

with first_company as (
  select id from public.companies order by created_at asc limit 1
),
admin_user as (
  insert into public.users (company_id, name, email, role, password_hash)
  select id, 'Nisha Admin', 'admin@reimbursex.com', 'admin', '$2a$10$IXNpHK2RlGu6AzggGRSK2.KGyjqwok7QhEgUvBFo36rC8F9gVesCa'
  from first_company
  where not exists (select 1 from public.users where email = 'admin@reimbursex.com')
  returning id, company_id
),
manager_user as (
  insert into public.users (company_id, name, email, role, password_hash)
  select id, 'Rohit Manager', 'manager@reimbursex.com', 'manager', '$2a$10$0YQsyUbVKalNnRPMZXus8.1u7irXdM5dbSZw2N7jU38epWgADvbeu'
  from first_company
  where not exists (select 1 from public.users where email = 'manager@reimbursex.com')
  returning id, company_id
)
insert into public.users (company_id, manager_id, name, email, role, password_hash)
select m.company_id, m.id, 'Anu Employee', 'employee@reimbursex.com', 'employee', '$2a$10$XxtdmZAsi.HHEu94n347wuIfo5e12Ft1ffpUpgfdgKPVqOgzHTm5q'
from manager_user m
where not exists (select 1 from public.users where email = 'employee@reimbursex.com');

with c as (
  select id as company_id from public.companies order by created_at asc limit 1
)
insert into public.approval_rules (company_id, escalate_after_days, min_approvals)
select c.company_id, 3, 1
from c
where not exists (select 1 from public.approval_rules ar where ar.company_id = c.company_id);

with c as (
  select id as company_id from public.companies order by created_at asc limit 1
),
m as (
  select id as manager_id, company_id from public.users where email = 'manager@reimbursex.com' limit 1
),
e as (
  select id as employee_id, name as employee_name, company_id from public.users where email = 'employee@reimbursex.com' limit 1
)
insert into public.expenses (company_id, employee_id, manager_id, employee_name, description, category, status, submitted_at, amount, amount_usd, currency_code)
select
  c.company_id,
  e.employee_id,
  m.manager_id,
  e.employee_name,
  x.description,
  x.category,
  x.status,
  x.submitted_at,
  x.amount,
  x.amount_usd,
  x.currency_code
from c, m, e,
(
  values
    ('Client site taxi', 'travel', 'pending', now() - interval '1 day', 3500.00, 42.00, 'INR'),
    ('Team lunch', 'food', 'pending', now() - interval '2 day', 1800.00, 21.00, 'INR'),
    ('Stationery', 'misc', 'approved', now() - interval '4 day', 900.00, 11.00, 'INR')
) as x(description, category, status, submitted_at, amount, amount_usd, currency_code)
where not exists (select 1 from public.expenses);
