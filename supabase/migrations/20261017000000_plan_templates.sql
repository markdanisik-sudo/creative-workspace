-- Plan templates: a project is photo, video or both, starts from a template
-- (social media, documentary, commercial, photo shoots…) or a custom pick,
-- and its Plan shows only the boxes chosen for it.

alter table public.project_workspaces
  add column medium text not null default 'video' check (medium in ('photo', 'video', 'both')),
  add column template text check (char_length(template) <= 40),
  -- The Plan's boxes in order; null = the classic set (brief, moodboard,
  -- shot list, locations, tasks) for projects made before templates.
  add column modules text[] check (cardinality(modules) <= 20);

-- Rows of the list-shaped boxes: interview questions, people, deliverables,
-- content plan, script scenes, gear, photo list. Fields live in `data`, so a
-- new field never needs a migration.
create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  module text not null check (
    module in ('interview', 'people', 'deliverables', 'content', 'script', 'gear', 'photos')
  ),
  position double precision not null default 0,
  data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 20000),
  done boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plan_items_project_idx on public.plan_items (project_id, module, position);

create trigger plan_items_set_updated_at
  before update on public.plan_items
  for each row execute function private.set_updated_at();

alter table public.plan_items enable row level security;

create policy "Members can read plan items"
  on public.plan_items for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members can add plan items"
  on public.plan_items for insert to authenticated
  with check (
    project_id in (select private.accessible_project_ids())
    and created_by = (select auth.uid())
  );

create policy "Members can edit plan items"
  on public.plan_items for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

create policy "Authors and the studio can delete plan items"
  on public.plan_items for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (created_by = (select auth.uid()) or (select private.is_studio_member()))
  );
