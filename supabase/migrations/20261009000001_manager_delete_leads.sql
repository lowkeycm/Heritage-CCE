-- Managers can delete a lead from the staff page (Clay, 2026-10-09). The page makes them type
-- "delete" first, removes the row, then removes the lead's photos from lead-photos.
-- Other staff still only read leads and change status and notes.

grant delete on public.leads to authenticated;

create policy "Managers delete leads" on public.leads
  for delete to authenticated
  using (public.can_manage_staff());

create policy "Managers delete lead photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lead-photos' and public.can_manage_staff());

-- A deleted lead takes its finished estimate-app draft (the customer's saved answers) with it.
alter table public.estimate_sessions
  drop constraint estimate_sessions_lead_id_fkey,
  add constraint estimate_sessions_lead_id_fkey
    foreign key (lead_id) references public.leads(id) on delete cascade;
