-- The story box: the idea and script written out in full, and Claude's
-- summary of it (or of handwritten notes uploaded as a photo or PDF).

create table public.project_stories (
  project_id uuid primary key references public.projects (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 200000),
  -- { title, logline, synopsis, tone, scenes: [...], needs: {...}, questions: [...] }
  summary jsonb check (summary is null or (jsonb_typeof(summary) = 'object' and pg_column_size(summary) < 64000)),
  summarized_at timestamptz,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger project_stories_set_updated_at
  before update on public.project_stories
  for each row execute function private.set_updated_at();

alter table public.project_stories enable row level security;

create policy "Members read the story"
  on public.project_stories for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members start the story"
  on public.project_stories for insert to authenticated
  with check (project_id in (select private.accessible_project_ids()));

create policy "Members write the story"
  on public.project_stories for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));
