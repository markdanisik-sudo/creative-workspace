-- Client portal: the studio runs the workspace, clients are invited into
-- individual projects (jobs) and collaborate on their content.
--
-- Access model after this migration:
--   * studio members can access every project;
--   * clients can access the projects they are members of;
--   * only the studio creates, renames or deletes projects and boards, and
--     manages who is invited;
--   * everyone with access can work on board content (collaboration).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Studio
-- ---------------------------------------------------------------------------

create table public.studio_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.studio_members enable row level security;

create policy "Signed-in users can see the studio team"
  on public.studio_members for select to authenticated
  using (true);

create or replace function private.is_studio_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.studio_members where user_id = auth.uid());
$$;

grant execute on function private.is_studio_member() to authenticated;

-- Public read-only helper for the app: "is the current user part of the studio?"
create or replace function public.current_user_is_studio()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_studio_member();
$$;

grant execute on function public.current_user_is_studio() to authenticated;

-- The first account ever created becomes the studio owner. Existing databases
-- promote their earliest user.
insert into public.studio_members (user_id)
select id from auth.users order by created_at limit 1
on conflict do nothing;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );

  if not exists (select 1 from public.studio_members) then
    insert into public.studio_members (user_id) values (new.id);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Project members
-- ---------------------------------------------------------------------------

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('client')),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_idx on public.project_members (user_id);

alter table public.project_members enable row level security;

-- Projects the current user may access: all of them for the studio, their
-- own memberships for clients.
create or replace function private.accessible_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.projects p
  where exists (select 1 from public.studio_members s where s.user_id = auth.uid())
     or p.owner_id = auth.uid()
     or exists (
       select 1 from public.project_members m
       where m.project_id = p.id and m.user_id = auth.uid()
     );
$$;

create or replace function private.accessible_board_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id
  from public.boards b
  where b.project_id in (select private.accessible_project_ids());
$$;

create policy "Members can see who is on their projects"
  on public.project_members for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "The studio adds project members"
  on public.project_members for insert to authenticated
  with check ((select private.is_studio_member()));

create policy "The studio removes project members"
  on public.project_members for delete to authenticated
  using ((select private.is_studio_member()));

-- Names of people you share a project with (for comments, member lists).
create policy "Users can read profiles of people they work with"
  on public.profiles for select to authenticated
  using (
    (select private.is_studio_member())
    or id in (select s.user_id from public.studio_members s)
    or id in (
      select m.user_id from public.project_members m
      where m.project_id in (select private.accessible_project_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- Projects and boards: readable by members, managed by the studio
-- ---------------------------------------------------------------------------

drop policy "Owners can read projects" on public.projects;
drop policy "Users can create their own projects" on public.projects;
drop policy "Owners can update projects" on public.projects;
drop policy "Owners can delete projects" on public.projects;

-- Checked directly (not via accessible_project_ids) so a freshly inserted
-- row is visible to the statement that created it.
create or replace function private.member_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.project_id from public.project_members m where m.user_id = auth.uid();
$$;

grant execute on function private.member_project_ids() to authenticated;

create policy "Members can read projects"
  on public.projects for select to authenticated
  using (
    (select private.is_studio_member())
    or owner_id = (select auth.uid())
    or id in (select private.member_project_ids())
  );

create policy "The studio creates projects"
  on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.is_studio_member()));

create policy "The studio updates projects"
  on public.projects for update to authenticated
  using ((select private.is_studio_member()))
  with check ((select private.is_studio_member()));

create policy "The studio deletes projects"
  on public.projects for delete to authenticated
  using ((select private.is_studio_member()));

drop policy "Project members can create boards" on public.boards;
drop policy "Project members can update boards" on public.boards;
drop policy "Project members can delete boards" on public.boards;

create policy "The studio creates boards"
  on public.boards for insert to authenticated
  with check (
    (select private.is_studio_member())
    and project_id in (select private.accessible_project_ids())
  );

create policy "The studio updates boards"
  on public.boards for update to authenticated
  using ((select private.is_studio_member()))
  with check ((select private.is_studio_member()));

create policy "The studio deletes boards"
  on public.boards for delete to authenticated
  using ((select private.is_studio_member()));

-- Content edits by clients still mark boards and projects as modified.
alter function private.touch_boards_from_rows() security definer;
alter function private.touch_project_from_board() security definer;

-- ---------------------------------------------------------------------------
-- Files: everyone on a project sees its files; uploads go to your own folder
-- ---------------------------------------------------------------------------

drop policy "Owners can delete files" on public.files;

create policy "Uploaders and the studio can delete files"
  on public.files for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (owner_id = (select auth.uid()) or (select private.is_studio_member()))
  );

drop policy "Users can read their project assets" on storage.objects;
drop policy "Users can delete their project assets" on storage.objects;

create policy "Project members can read project assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[2] in (select id::text from private.accessible_project_ids() as id)
  );

create policy "Uploaders and the studio can delete assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'assets'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (
        (select private.is_studio_member())
        and (storage.foldername(name))[2] in (select id::text from private.accessible_project_ids() as id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------

-- The link token is never stored, only its SHA-256 hash.
create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) between 3 and 320),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);

create index project_invitations_project_idx on public.project_invitations (project_id, created_at desc);

alter table public.project_invitations enable row level security;

create policy "The studio manages invitations"
  on public.project_invitations for all to authenticated
  using ((select private.is_studio_member()))
  with check ((select private.is_studio_member()) and invited_by = (select auth.uid()));

create or replace function private.hash_token(token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(token, 'sha256'), 'hex');
$$;

-- What the invite page shows before the visitor has an account.
create or replace function public.get_invitation(invite_token text)
returns table (
  project_name text,
  email text,
  invited_by_name text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.name,
    i.email,
    coalesce(pr.display_name, 'm.studio'),
    case
      when i.accepted_at is not null then 'accepted'
      when i.expires_at < now() then 'expired'
      else 'pending'
    end
  from public.project_invitations i
  join public.projects p on p.id = i.project_id
  left join public.profiles pr on pr.id = i.invited_by
  where i.token_hash = private.hash_token(invite_token);
$$;

grant execute on function public.get_invitation(text) to anon, authenticated;

-- Joins the signed-in user to the invited project. The account email must
-- match the invitation. Returns the project id.
create or replace function public.accept_invitation(invite_token text)
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

  select * into invitation
  from public.project_invitations
  where token_hash = private.hash_token(invite_token)
  for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  select lower(u.email) into account_email from auth.users u where u.id = auth.uid();

  if invitation.email <> account_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
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

grant execute on function public.accept_invitation(text) to authenticated;
