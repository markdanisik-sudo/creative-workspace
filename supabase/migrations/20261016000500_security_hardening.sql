-- Security hardening.

-- ---------------------------------------------------------------------------
-- Accounts nobody has invited can't create projects or read the studio's
-- billing details. (Sign-up has to stay open for invitations, so a stranger
-- may create an account; it must not get them anywhere.)
-- ---------------------------------------------------------------------------

create or replace function private.has_any_membership()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.project_members m where m.user_id = auth.uid());
$$;

grant execute on function private.has_any_membership() to authenticated;

drop policy "Signed-in users create their own projects" on public.projects;
create policy "The studio and invited clients create their own projects"
  on public.projects for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and ((select private.is_studio_member()) or (select private.has_any_membership()))
  );

drop policy "Signed-in users can read the studio's billing details" on public.studio_billing;
create policy "The studio and its clients read the studio's billing details"
  on public.studio_billing for select to authenticated
  using ((select private.is_studio_member()) or (select private.has_any_membership()));

-- ---------------------------------------------------------------------------
-- Joining from the list of invitations trusts the account's email address,
-- which is only safe when sign-up confirms emails. Off until it does; the
-- invitation link (a secret token) keeps working either way.
-- ---------------------------------------------------------------------------

create table public.app_settings (
  id boolean primary key default true check (id),
  -- Turn on once Supabase Auth confirms emails (custom SMTP + "Confirm email").
  emails_verified boolean not null default false
);

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;

create policy "Signed-in users can read app settings"
  on public.app_settings for select to authenticated
  using (true);

create or replace function private.emails_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.emails_verified from public.app_settings s where s.id), false);
$$;

create or replace function public.my_invitations()
returns table (id uuid, project_name text, invited_by_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, p.name, coalesce(pr.display_name, 'm.studio'), i.created_at
  from public.project_invitations i
  join public.projects p on p.id = i.project_id
  left join public.profiles pr on pr.id = i.invited_by
  where private.emails_verified()
    and i.email = (select lower(u.email) from auth.users u where u.id = auth.uid())
    and i.accepted_at is null
    and i.expires_at >= now()
    and not exists (
      select 1 from public.project_members m
      where m.project_id = i.project_id and m.user_id = auth.uid()
    )
  order by i.created_at desc;
$$;

create or replace function public.accept_invitation_by_id(invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.project_invitations;
  account_email text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if not private.emails_verified() then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  select * into invitation
  from public.project_invitations
  where id = invitation_id
  for update;

  select lower(u.email) into account_email from auth.users u where u.id = auth.uid();

  if invitation.id is null or invitation.email <> account_email then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  if invitation.accepted_at is null then
    if invitation.expires_at < now() then
      raise exception 'invitation_expired' using errcode = '22023';
    end if;
    update public.project_invitations
    set accepted_at = now(), accepted_by = auth.uid()
    where id = invitation.id;
  elsif invitation.accepted_by is distinct from auth.uid() then
    raise exception 'invitation_already_used' using errcode = '42501';
  end if;

  insert into public.project_members (project_id, user_id, role, added_by)
  values (invitation.project_id, auth.uid(), 'client', invitation.invited_by)
  on conflict do nothing;

  return invitation.project_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Two-factor authentication: once an account has a verified second factor,
-- changing money-related data needs a session that used it (aal2).
-- ---------------------------------------------------------------------------

create or replace function private.second_factor_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = auth.uid() and f.status = 'verified'
    );
$$;

grant execute on function private.second_factor_ok() to authenticated;

drop policy "The studio edits its billing details" on public.studio_billing;
create policy "The studio edits its billing details"
  on public.studio_billing for update to authenticated
  using ((select private.is_studio_member()) and (select private.second_factor_ok()))
  with check ((select private.is_studio_member()) and (select private.second_factor_ok()));

drop policy "The studio marks invoices paid" on public.invoices;
create policy "The studio marks invoices paid"
  on public.invoices for update to authenticated
  using ((select private.is_studio_member()) and (select private.second_factor_ok()))
  with check ((select private.is_studio_member()) and (select private.second_factor_ok()));

drop policy "The studio deletes invoices" on public.invoices;
create policy "The studio deletes invoices"
  on public.invoices for delete to authenticated
  using ((select private.is_studio_member()) and (select private.second_factor_ok()));

drop policy "The studio edits budget lines" on public.budget_items;
create policy "The studio edits budget lines"
  on public.budget_items for update to authenticated
  using ((select private.is_studio_member()) and (select private.second_factor_ok()))
  with check ((select private.is_studio_member()) and (select private.second_factor_ok()));

drop policy "The studio adds budget lines" on public.budget_items;
create policy "The studio adds budget lines"
  on public.budget_items for insert to authenticated
  with check (
    (select private.is_studio_member())
    and (select private.second_factor_ok())
    and project_id in (select private.accessible_project_ids())
  );

drop policy "The studio removes budget lines" on public.budget_items;
create policy "The studio removes budget lines"
  on public.budget_items for delete to authenticated
  using ((select private.is_studio_member()) and (select private.second_factor_ok()));
