-- Everything around a job besides its boards: phase and tasks, dates,
-- comments, and add-on requests from a studio-defined service catalog.

-- ---------------------------------------------------------------------------
-- Project details
-- ---------------------------------------------------------------------------

alter table public.projects
  add column client_name text check (char_length(client_name) <= 120),
  add column phase text not null default 'brief'
    check (phase in ('brief', 'preproduction', 'production', 'postproduction', 'delivery'));

-- ---------------------------------------------------------------------------
-- Tasks, grouped by production phase (the job's kanban)
-- ---------------------------------------------------------------------------

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase text not null default 'brief'
    check (phase in ('brief', 'preproduction', 'production', 'postproduction', 'delivery')),
  title text not null check (char_length(trim(title)) between 1 and 300),
  notes text check (char_length(notes) <= 5000),
  due_date date,
  done boolean not null default false,
  position double precision not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_tasks_project_idx on public.project_tasks (project_id, phase, position);

create trigger project_tasks_set_updated_at
  before update on public.project_tasks
  for each row execute function private.set_updated_at();

alter table public.project_tasks enable row level security;

create policy "Members can read tasks"
  on public.project_tasks for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members can add tasks"
  on public.project_tasks for insert to authenticated
  with check (
    project_id in (select private.accessible_project_ids())
    and created_by = (select auth.uid())
  );

create policy "Members can update tasks"
  on public.project_tasks for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

create policy "Authors and the studio can delete tasks"
  on public.project_tasks for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (created_by = (select auth.uid()) or (select private.is_studio_member()))
  );

-- ---------------------------------------------------------------------------
-- Dates: shoot days, deadlines, meetings, delivery
-- ---------------------------------------------------------------------------

create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null default 'shoot'
    check (kind in ('shoot', 'deadline', 'meeting', 'delivery', 'other')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  all_day boolean not null default true,
  location text check (char_length(location) <= 300),
  notes text check (char_length(notes) <= 5000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_events_project_idx on public.project_events (project_id, starts_at);

create trigger project_events_set_updated_at
  before update on public.project_events
  for each row execute function private.set_updated_at();

alter table public.project_events enable row level security;

create policy "Members can read dates"
  on public.project_events for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "The studio manages dates"
  on public.project_events for all to authenticated
  using ((select private.is_studio_member()))
  with check (
    (select private.is_studio_member())
    and project_id in (select private.accessible_project_ids())
  );

-- ---------------------------------------------------------------------------
-- Comments, on the job or on one of its boards
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  board_id uuid references public.boards (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_project_idx on public.comments (project_id, created_at);
create index comments_board_idx on public.comments (board_id, created_at);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function private.set_updated_at();

alter table public.comments enable row level security;

create policy "Members can read comments"
  on public.comments for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members can comment"
  on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and project_id in (select private.accessible_project_ids())
    and (
      board_id is null
      or board_id in (select b.id from public.boards b where b.project_id = comments.project_id)
    )
  );

create policy "Authors can edit their comments"
  on public.comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "Authors and the studio can delete comments"
  on public.comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or (
      (select private.is_studio_member())
      and project_id in (select private.accessible_project_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- Services the studio offers as add-ons, and requests for them
-- ---------------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (char_length(description) <= 1000),
  unit text not null default 'item' check (unit in ('day', 'hour', 'cut', 'item')),
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  currency text not null default 'CZK' check (char_length(currency) = 3),
  active boolean not null default true,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

alter table public.services enable row level security;

create policy "Signed-in users can read the service catalog"
  on public.services for select to authenticated
  using (true);

create policy "The studio manages the service catalog"
  on public.services for all to authenticated
  using ((select private.is_studio_member()))
  with check ((select private.is_studio_member()));

insert into public.services (name, description, unit, position) values
  ('Additional shoot day', 'An extra day of shooting with the same crew and setup.', 'day', 1),
  ('Additional edit', 'Another cut of the film, e.g. a different length or format.', 'cut', 2),
  ('Social cutdowns', 'Short vertical versions for Instagram, TikTok and Reels.', 'item', 3),
  ('Extra retouched photos', 'More final images beyond the agreed selection.', 'item', 4),
  ('Colour grading revision', 'Another round of colour adjustments.', 'item', 5);

create table public.project_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  -- Snapshot of the service at the time of the request.
  title text not null check (char_length(trim(title)) between 1 and 200),
  unit text not null default 'item' check (unit in ('day', 'hour', 'cut', 'item')),
  unit_price numeric(12, 2),
  currency text not null default 'CZK',
  quantity integer not null default 1 check (quantity between 1 and 100),
  details text check (char_length(details) <= 5000),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'declined', 'done')),
  requested_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_requests_project_idx on public.project_requests (project_id, created_at desc);

create trigger project_requests_set_updated_at
  before update on public.project_requests
  for each row execute function private.set_updated_at();

alter table public.project_requests enable row level security;

create policy "Members can read requests"
  on public.project_requests for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members can make requests"
  on public.project_requests for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and status = 'requested'
    and decided_by is null
    and project_id in (select private.accessible_project_ids())
  );

create policy "The studio decides on requests"
  on public.project_requests for update to authenticated
  using ((select private.is_studio_member()))
  with check ((select private.is_studio_member()));

create policy "Requesters can withdraw open requests"
  on public.project_requests for delete to authenticated
  using (
    (requested_by = (select auth.uid()) and status = 'requested')
    or (select private.is_studio_member())
  );

-- The dashboard summary gains the client and phase.
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
  )::integer as open_request_count
from public.projects p;
