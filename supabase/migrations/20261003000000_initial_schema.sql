-- Initial schema: profiles, projects, boards, canvas objects, assets and files.
--
-- Access model: a user can access a project they own. Every other table is
-- authorised through its project. The ownership checks live in two
-- security-definer helpers in the `private` schema, so that adding project
-- membership (collaboration) later means changing those helpers only.

create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Utilities
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text check (char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (char_length(description) <= 2000),
  cover_path text check (char_length(cover_path) <= 1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);
create index projects_name_trgm_idx on public.projects using gin (name extensions.gin_trgm_ops);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();

alter table public.projects enable row level security;

create policy "Owners can read projects"
  on public.projects for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Users can create their own projects"
  on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners can update projects"
  on public.projects for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners can delete projects"
  on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Projects the current user may access. Collaboration will extend this.
create or replace function private.accessible_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.projects p where p.owner_id = auth.uid();
$$;

grant execute on function private.accessible_project_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Boards
-- ---------------------------------------------------------------------------

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  -- Starter template applied by the client the first time the board opens.
  template text check (char_length(template) <= 64),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boards_project_idx on public.boards (project_id, position);
create index boards_name_trgm_idx on public.boards using gin (name extensions.gin_trgm_ops);

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function private.set_updated_at();

alter table public.boards enable row level security;

create policy "Project members can read boards"
  on public.boards for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Project members can create boards"
  on public.boards for insert to authenticated
  with check (project_id in (select private.accessible_project_ids()));

create policy "Project members can update boards"
  on public.boards for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

create policy "Project members can delete boards"
  on public.boards for delete to authenticated
  using (project_id in (select private.accessible_project_ids()));

create or replace function private.accessible_board_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id
  from public.boards b
  join public.projects p on p.id = b.project_id
  where p.owner_id = auth.uid();
$$;

grant execute on function private.accessible_board_ids() to authenticated;

-- A board change marks its project as modified.
create or replace function private.touch_project_from_board()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.projects
  set updated_at = now()
  where id = coalesce(new.project_id, old.project_id);
  return null;
end;
$$;

create trigger boards_touch_project
  after insert or update or delete on public.boards
  for each row execute function private.touch_project_from_board();

-- ---------------------------------------------------------------------------
-- Files (uploaded binaries live in Storage; this is their metadata)
-- ---------------------------------------------------------------------------

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  board_id uuid references public.boards (id) on delete set null,
  storage_path text not null unique check (char_length(storage_path) <= 1024),
  preview_path text check (char_length(preview_path) <= 1024),
  name text not null default '' check (char_length(name) <= 255),
  mime_type text not null check (char_length(mime_type) <= 255),
  size_bytes bigint not null check (size_bytes >= 0),
  width integer check (width >= 0),
  height integer check (height >= 0),
  created_at timestamptz not null default now()
);

create index files_project_idx on public.files (project_id, created_at desc);
create index files_board_idx on public.files (board_id);

alter table public.files enable row level security;

create policy "Owners can read files"
  on public.files for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

-- The storage path must sit inside the uploader's own folder for that project.
create policy "Owners can register files"
  on public.files for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and project_id in (select private.accessible_project_ids())
    and storage_path like (select auth.uid())::text || '/' || project_id::text || '/%'
    and (
      preview_path is null
      or preview_path like (select auth.uid())::text || '/' || project_id::text || '/%'
    )
  );

create policy "Owners can delete files"
  on public.files for delete to authenticated
  using (project_id in (select private.accessible_project_ids()));

-- ---------------------------------------------------------------------------
-- Canvas objects
-- ---------------------------------------------------------------------------

create table public.canvas_objects (
  board_id uuid not null references public.boards (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  type text not null check (char_length(type) between 1 and 64),
  -- Containing object (section/frame/group), or null when on the board itself.
  parent_id text check (char_length(parent_id) <= 128),
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision not null default 0,
  height double precision not null default 0,
  rotation double precision not null default 0,
  -- Fractional index: reordering never rewrites neighbouring rows.
  z_index text not null check (char_length(z_index) between 1 and 256),
  -- Type-specific properties plus a schema version.
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 262144),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (board_id, id)
);

create index canvas_objects_board_z_idx on public.canvas_objects (board_id, z_index);
create index canvas_objects_type_idx on public.canvas_objects (board_id, type);

create trigger canvas_objects_set_updated_at
  before update on public.canvas_objects
  for each row execute function private.set_updated_at();

alter table public.canvas_objects enable row level security;

create policy "Members can read canvas objects"
  on public.canvas_objects for select to authenticated
  using (board_id in (select private.accessible_board_ids()));

create policy "Members can create canvas objects"
  on public.canvas_objects for insert to authenticated
  with check (board_id in (select private.accessible_board_ids()));

create policy "Members can update canvas objects"
  on public.canvas_objects for update to authenticated
  using (board_id in (select private.accessible_board_ids()))
  with check (board_id in (select private.accessible_board_ids()));

create policy "Members can delete canvas objects"
  on public.canvas_objects for delete to authenticated
  using (board_id in (select private.accessible_board_ids()));

-- Connections between objects (e.g. arrows bound to shapes).
create table public.canvas_connections (
  board_id uuid not null references public.boards (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  type text not null check (char_length(type) between 1 and 64),
  from_id text not null check (char_length(from_id) <= 128),
  to_id text not null check (char_length(to_id) <= 128),
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (board_id, id)
);

create trigger canvas_connections_set_updated_at
  before update on public.canvas_connections
  for each row execute function private.set_updated_at();

alter table public.canvas_connections enable row level security;

create policy "Members can manage canvas connections"
  on public.canvas_connections for all to authenticated
  using (board_id in (select private.accessible_board_ids()))
  with check (board_id in (select private.accessible_board_ids()));

-- Media and link metadata referenced by canvas objects.
create table public.board_assets (
  board_id uuid not null references public.boards (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  type text not null check (char_length(type) between 1 and 64),
  file_id uuid references public.files (id) on delete set null,
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (board_id, id)
);

create index board_assets_file_idx on public.board_assets (file_id);

create trigger board_assets_set_updated_at
  before update on public.board_assets
  for each row execute function private.set_updated_at();

alter table public.board_assets enable row level security;

create policy "Members can manage board assets"
  on public.board_assets for all to authenticated
  using (board_id in (select private.accessible_board_ids()))
  with check (
    board_id in (select private.accessible_board_ids())
    and (file_id is null or file_id in (
      select f.id from public.files f
      where f.project_id in (select private.accessible_project_ids())
    ))
  );

-- Any change to a board's contents marks the board (and so its project) as
-- modified. Statement-level so a batch save touches each board once.
create or replace function private.touch_boards_from_rows()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.boards set updated_at = now()
    where id in (select distinct board_id from old_rows);
  else
    update public.boards set updated_at = now()
    where id in (select distinct board_id from new_rows);
  end if;
  return null;
end;
$$;

create trigger canvas_objects_touch_board_ins
  after insert on public.canvas_objects
  referencing new table as new_rows
  for each statement execute function private.touch_boards_from_rows();

create trigger canvas_objects_touch_board_upd
  after update on public.canvas_objects
  referencing new table as new_rows
  for each statement execute function private.touch_boards_from_rows();

create trigger canvas_objects_touch_board_del
  after delete on public.canvas_objects
  referencing old table as old_rows
  for each statement execute function private.touch_boards_from_rows();

-- ---------------------------------------------------------------------------
-- Dashboard summary
-- ---------------------------------------------------------------------------

-- security_invoker: the view runs with the caller's RLS, never the owner's.
create view public.project_summaries
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
  ) as cover_path
from public.projects p;

grant select on public.project_summaries to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: one private bucket, foldered by user / project / board.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets',
  'assets',
  false,
  209715200, -- 200 MiB
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'text/plain', 'text/markdown', 'text/csv', 'application/rtf',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read their project assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] in (select id::text from private.accessible_project_ids() as id)
  );

create policy "Users can upload to their project folders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] in (select id::text from private.accessible_project_ids() as id)
  );

create policy "Users can delete their project assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
