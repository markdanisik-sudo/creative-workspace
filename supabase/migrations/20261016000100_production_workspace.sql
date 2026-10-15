-- The production workspace: a brief, a moodboard, locations and a shot list
-- per project. Everyone on the project works on them together.

-- ---------------------------------------------------------------------------
-- Brief and shot-list defaults (one row per project)
-- ---------------------------------------------------------------------------

create table public.project_workspaces (
  project_id uuid primary key references public.projects (id) on delete cascade,
  -- { goal, audience, message, deliverables, tone, budget, notes }
  brief jsonb not null default '{}'::jsonb,
  -- Camera settings every shot inherits unless it says otherwise.
  shot_defaults jsonb not null default '{}'::jsonb,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (octet_length(brief::text) <= 100000),
  check (octet_length(shot_defaults::text) <= 10000)
);

create trigger project_workspaces_set_updated_at
  before update on public.project_workspaces
  for each row execute function private.set_updated_at();

alter table public.project_workspaces enable row level security;

create policy "Members can read the workspace"
  on public.project_workspaces for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members can start the workspace"
  on public.project_workspaces for insert to authenticated
  with check (project_id in (select private.accessible_project_ids()));

create policy "Members can edit the workspace"
  on public.project_workspaces for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------

create table public.project_locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  address text check (char_length(address) <= 500),
  contact text check (char_length(contact) <= 500),
  notes text check (char_length(notes) <= 5000),
  status text not null default 'idea' check (status in ('idea', 'scouting', 'confirmed')),
  position double precision not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_locations_project_idx on public.project_locations (project_id, position);

create trigger project_locations_set_updated_at
  before update on public.project_locations
  for each row execute function private.set_updated_at();

alter table public.project_locations enable row level security;

create policy "Members can read locations"
  on public.project_locations for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members can add locations"
  on public.project_locations for insert to authenticated
  with check (
    project_id in (select private.accessible_project_ids())
    and created_by = (select auth.uid())
  );

create policy "Members can update locations"
  on public.project_locations for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

create policy "Authors and the studio can delete locations"
  on public.project_locations for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (created_by = (select auth.uid()) or (select private.is_studio_member()))
  );

-- ---------------------------------------------------------------------------
-- Images: the moodboard, and photos of locations
-- ---------------------------------------------------------------------------

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  collection text not null check (collection in ('moodboard', 'location')),
  location_id uuid references public.project_locations (id) on delete cascade,
  -- Paths in the "assets" bucket: <uploader>/<project>/images/<file>
  storage_path text not null check (char_length(storage_path) <= 500),
  preview_path text check (char_length(preview_path) <= 500),
  width integer check (width > 0),
  height integer check (height > 0),
  caption text check (char_length(caption) <= 500),
  position double precision not null default 0,
  uploaded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((collection = 'location') = (location_id is not null))
);

create index project_images_project_idx on public.project_images (project_id, collection, position);

alter table public.project_images enable row level security;

create policy "Members can see images"
  on public.project_images for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

-- The file must sit in the uploader's own folder of this project.
create policy "Members can add images"
  on public.project_images for insert to authenticated
  with check (
    project_id in (select private.accessible_project_ids())
    and uploaded_by = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and split_part(storage_path, '/', 2) = project_id::text
  );

create policy "Members can caption and reorder images"
  on public.project_images for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

create policy "Uploaders and the studio can remove images"
  on public.project_images for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (uploaded_by = (select auth.uid()) or (select private.is_studio_member()))
  );

-- ---------------------------------------------------------------------------
-- Shot list
-- ---------------------------------------------------------------------------

create table public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  position double precision not null default 0,
  scene text check (char_length(scene) <= 40),
  description text check (char_length(description) <= 2000),
  int_ext text check (int_ext in ('int', 'ext', 'int_ext')),
  day_night text check (day_night in ('day', 'night', 'dawn', 'dusk')),
  location_id uuid references public.project_locations (id) on delete set null,
  duration_seconds integer check (duration_seconds between 0 and 86400),
  -- Camera, lens, resolution, codec, aspect, fps, size, angle, movement, support…
  specs jsonb not null default '{}'::jsonb check (octet_length(specs::text) <= 10000),
  notes text check (char_length(notes) <= 5000),
  done boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shots_project_idx on public.shots (project_id, position);

create trigger shots_set_updated_at
  before update on public.shots
  for each row execute function private.set_updated_at();

alter table public.shots enable row level security;

create policy "Members can read shots"
  on public.shots for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members can add shots"
  on public.shots for insert to authenticated
  with check (
    project_id in (select private.accessible_project_ids())
    and created_by = (select auth.uid())
  );

create policy "Members can update shots"
  on public.shots for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

create policy "Members can delete shots"
  on public.shots for delete to authenticated
  using (project_id in (select private.accessible_project_ids()));
