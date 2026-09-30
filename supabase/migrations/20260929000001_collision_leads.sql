-- Heritage Collision lead intake (project zxzzmrkyctbgxlgjritv, being renamed "Heritage Collision").
-- One lead list for both collision brands:
--   commercial = Heritage Commercial Collision Experts (heritagecce.com)
--   retail     = Heritage Collision Experts
-- The old estimate_requests / hccesettings / estimate-photos objects keep serving the
-- current heritagecce.com until it is redirected; this migration does not touch them.

-- Who may sign in to the staff page. Keyed by login email so a person can be added
-- before they have ever signed in.
create table public.staff_members (
  email text primary key check (email = lower(email) and email like '%_@_%'),
  full_name text not null check (length(full_name) between 1 and 120),
  can_manage_staff boolean not null default false,
  added_by text,
  added_at timestamptz not null default now(),
  last_login_link_at timestamptz
);
comment on table public.staff_members is 'Heritage Collision staff allowed to read leads. can_manage_staff lets them add or remove people and change alert emails.';

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  brand text not null check (brand in ('commercial', 'retail')),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  name text not null,
  phone text,
  email text,
  business_name text,
  vehicle text,
  vehicle_type text,
  insurance text,
  claim_number text,
  message text,
  preferred_contact text,
  best_time text,
  photos jsonb not null default '[]'::jsonb,
  source_page text,
  alert_sent_at timestamptz,
  alert_error text,
  staff_notes text,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint leads_phone_or_email check (coalesce(phone, '') <> '' or coalesce(email, '') <> '')
);
comment on table public.leads is 'Website leads for both collision brands. Written only by the submit-lead edge function; staff may change status and notes.';
create index leads_created_at_idx on public.leads (created_at desc);
create index leads_brand_status_idx on public.leads (brand, status);

-- Who gets the new-lead email for each brand.
create table public.lead_alert_recipients (
  brand text primary key check (brand in ('commercial', 'retail')),
  emails text[] not null check (cardinality(emails) between 1 and 10)
);

-- Access helpers. Security definer so the check can read staff_members under RLS.
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_members
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create function public.can_manage_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_members
    where email = lower(coalesce(auth.jwt() ->> 'email', '')) and can_manage_staff
  );
$$;

revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.can_manage_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_manage_staff() to authenticated;

-- Record who last changed a lead.
create function public.leads_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', 'system');
  return new;
end;
$$;
create trigger leads_touch before update on public.leads
for each row execute function public.leads_touch();

-- Record who added a staff member (not trusted from the browser).
create function public.staff_members_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.added_by := coalesce(auth.jwt() ->> 'email', new.added_by, 'system');
  new.added_at := now();
  return new;
end;
$$;
create trigger staff_members_stamp before insert on public.staff_members
for each row execute function public.staff_members_stamp();

-- Row level security. Nothing is readable or writable without a staff login;
-- the edge functions use the service role.
alter table public.staff_members enable row level security;
alter table public.leads enable row level security;
alter table public.lead_alert_recipients enable row level security;

revoke all on public.staff_members, public.leads, public.lead_alert_recipients from anon;
revoke all on public.staff_members, public.leads, public.lead_alert_recipients from authenticated;

grant select on public.leads to authenticated;
grant update (status, staff_notes) on public.leads to authenticated;
create policy "Staff read leads" on public.leads
  for select to authenticated using (public.is_staff());
create policy "Staff update lead status and notes" on public.leads
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

grant select on public.staff_members to authenticated;
grant insert (email, full_name, can_manage_staff) on public.staff_members to authenticated;
grant update (full_name, can_manage_staff) on public.staff_members to authenticated;
grant delete on public.staff_members to authenticated;
create policy "Staff see the staff list" on public.staff_members
  for select to authenticated using (public.is_staff());
create policy "Managers add staff" on public.staff_members
  for insert to authenticated with check (public.can_manage_staff());
create policy "Managers edit other staff" on public.staff_members
  for update to authenticated
  using (public.can_manage_staff() and email <> lower(auth.jwt() ->> 'email'))
  with check (public.can_manage_staff());
create policy "Managers remove other staff" on public.staff_members
  for delete to authenticated
  using (public.can_manage_staff() and email <> lower(auth.jwt() ->> 'email'));

grant select on public.lead_alert_recipients to authenticated;
grant update (emails) on public.lead_alert_recipients to authenticated;
create policy "Staff see alert recipients" on public.lead_alert_recipients
  for select to authenticated using (public.is_staff());
create policy "Managers change alert recipients" on public.lead_alert_recipients
  for update to authenticated using (public.can_manage_staff()) with check (public.can_manage_staff());

-- Private photo storage. Uploads happen in the submit-lead function only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-photos', 'lead-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

create policy "Staff view lead photos" on storage.objects
  for select to authenticated using (bucket_id = 'lead-photos' and public.is_staff());

-- Starting data (Clay, 2026-09-29): Clay, Addaie and Tom can sign in and add others.
-- Alerts go to Addaie until a dedicated address exists.
insert into public.staff_members (email, full_name, can_manage_staff, added_by) values
  ('clay@relevaint.io', 'Clay Mallory', true, 'setup'),
  ('addaie@heritagecce.com', 'Addaie Amankwaah', true, 'setup'),
  ('tom.wengrowski@heritagecoach.com', 'Tom Wengrowski', true, 'setup');

insert into public.lead_alert_recipients (brand, emails) values
  ('commercial', array['addaie@heritagecce.com']),
  ('retail', array['addaie@heritagecce.com']);
