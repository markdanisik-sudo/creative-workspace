-- Clients can start their own projects; the studio sees them right away.

-- Anyone signed in may create a project they own.
drop policy "The studio creates projects" on public.projects;
create policy "Signed-in users create their own projects"
  on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- The studio updates any project; a client updates the projects they started.
drop policy "The studio updates projects" on public.projects;
create policy "The studio and project owners update projects"
  on public.projects for update to authenticated
  using ((select private.is_studio_member()) or owner_id = (select auth.uid()))
  with check ((select private.is_studio_member()) or owner_id = (select auth.uid()));

-- Deleting stays with the studio.

create or replace function private.owned_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.projects p where p.owner_id = auth.uid();
$$;

grant execute on function private.owned_project_ids() to authenticated;

-- Boards: the studio, or the client who started the project.
drop policy "The studio creates boards" on public.boards;
create policy "The studio and project owners create boards"
  on public.boards for insert to authenticated
  with check (
    project_id in (select private.accessible_project_ids())
    and (
      (select private.is_studio_member())
      or project_id in (select private.owned_project_ids())
    )
  );

drop policy "The studio updates boards" on public.boards;
create policy "The studio and project owners update boards"
  on public.boards for update to authenticated
  using (
    (select private.is_studio_member())
    or project_id in (select private.owned_project_ids())
  )
  with check (
    (select private.is_studio_member())
    or project_id in (select private.owned_project_ids())
  );

drop policy "The studio deletes boards" on public.boards;
create policy "The studio and project owners delete boards"
  on public.boards for delete to authenticated
  using (
    (select private.is_studio_member())
    or project_id in (select private.owned_project_ids())
  );

-- A client who starts a project becomes its member, so every "my projects"
-- check (accessible_project_ids, storage, comments…) includes it.
create or replace function private.add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.studio_members s where s.user_id = new.owner_id) then
    insert into public.project_members (project_id, user_id, added_by)
    values (new.id, new.owner_id, new.owner_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger projects_add_owner_as_member
  after insert on public.projects
  for each row execute function private.add_owner_as_member();

-- The dashboard summary says which projects a client started.
create or replace view public.project_summaries
with (security_invoker = on)
as
select
  p.id,
  p.owner_id,
  p.name,
  p.description,
  p.created_at,
  p.updated_at,
  (
    select count(*)
    from public.canvas_objects o
    join public.boards b on b.id = o.board_id
    where b.project_id = p.id
  )::integer as item_count,
  (
    select count(*) from public.boards b where b.project_id = p.id
  )::integer as board_count,
  coalesce(
    p.cover_path,
    (
      select coalesce(f.preview_path, f.storage_path)
      from public.canvas_objects o
      join public.boards b on b.id = o.board_id
      join public.board_assets a
        on a.board_id = o.board_id and a.id = o.data -> 'props' ->> 'assetId'
      join public.files f on f.id = a.file_id
      where b.project_id = p.id and o.type = 'image'
      order by o.z_index desc, o.updated_at desc
      limit 1
    )
  ) as cover_path,
  p.client_name,
  p.phase,
  (
    select min(e.starts_at) from public.project_events e
    where e.project_id = p.id and e.starts_at >= date_trunc('day', now())
  ) as next_event_at,
  (
    select count(*) from public.project_requests r
    where r.project_id = p.id and r.status = 'requested'
  )::integer as open_request_count,
  -- Started by a client rather than by the studio.
  not exists (
    select 1 from public.studio_members s where s.user_id = p.owner_id
  ) as created_by_client
from public.projects p;
