-- Estimate app (QR code app at estimate.heritagecce.com, rebuilt at /estimate/ on this site).
-- Replaces the Lovable "Fleet Focus" app, which kept its own database. Clay, 2026-09-29.

-- Extra details the estimate app collects. Website form leads leave them empty.
alter table public.leads
  add column source text not null default 'website' check (source in ('website', 'estimate-app')),
  add column reference text unique,
  add column vin text,
  add column vehicle_year text,
  add column vehicle_make text,
  add column vehicle_model text,
  add column license_plate text,
  add column mileage integer check (mileage >= 0),
  add column damage_areas text[] not null default '{}',
  add column is_rush boolean not null default false,
  add column needed_by date;

comment on column public.leads.reference is 'Customer-facing reference (HCC-YYYY-NNNNNN) for estimate app requests.';

-- In-progress estimates. Lets a customer start on a computer and finish on a phone (QR code),
-- or come back later. Only the estimate edge function touches this table; the customer holds a
-- random token and only its SHA-256 hash is stored here.
create table public.estimate_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  step text,
  form jsonb not null default '{}'::jsonb,
  photos jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  lead_id uuid references public.leads (id) on delete set null
);
comment on table public.estimate_sessions is 'Estimate app drafts. Service role only (estimate edge function). photos maps slot -> {path, type, size}.';

alter table public.estimate_sessions enable row level security;
revoke all on public.estimate_sessions from anon, authenticated;
