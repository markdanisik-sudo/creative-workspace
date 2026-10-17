-- Discussion messages about a part of the Plan, and the moodboard's palette.

-- What a message is about: a Plan box (topic) and, optionally, something in
-- it (target: 'palette', 'image:<uuid>', 'item:<uuid>'). Until it's marked
-- resolved, the box is flagged for the other side.
alter table public.comments
  add column topic text check (topic is null or topic ~ '^[a-z_]{2,20}$'),
  add column target text check (
    target is null
    or target = 'palette'
    or target ~ '^(image|item):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  add column resolved_at timestamptz,
  add column resolved_by uuid references auth.users (id) on delete set null,
  add constraint comments_target_needs_topic check (target is null or topic is not null);

create index comments_open_topics_idx on public.comments (project_id, topic)
  where topic is not null and resolved_at is null;

-- Marking a message resolved: the studio, or whoever wrote it. (Editing the
-- text stays author-only, so this goes through a function, not a policy.)
create or replace function public.set_comment_resolved(comment_id uuid, resolved boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.comments;
begin
  select * into found from public.comments where id = comment_id;
  if found.id is null
    or found.project_id not in (select private.accessible_project_ids())
    or not (found.author_id = auth.uid() or private.is_studio_member())
  then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.comments
  set resolved_at = case when resolved then now() end,
      resolved_by = case when resolved then auth.uid() end
  where id = comment_id;
end;
$$;

revoke execute on function public.set_comment_resolved(uuid, boolean) from public, anon;
grant execute on function public.set_comment_resolved(uuid, boolean) to authenticated;

-- The moodboard's colour palette: { colors: [{ hex, name }], preset, notes }.
alter table public.project_workspaces
  add column palette jsonb not null default '{}'::jsonb
    check (jsonb_typeof(palette) = 'object' and pg_column_size(palette) < 8000);

-- Resolving a message isn't editing it: only a new text moves updated_at
-- (which shows "edited").
drop trigger comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
  before update on public.comments
  for each row
  when (old.body is distinct from new.body)
  execute function private.set_updated_at();
